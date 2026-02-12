package handlers

import (
	"alpaca-bookmarks/internal/database"
	"alpaca-bookmarks/internal/models"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

type TakeoutData struct {
	Theme        string               `json:"theme"`
	Layouts      string               `json:"layouts"`
	Bookmarks    []models.Bookmark    `json:"bookmarks"`
	Tags         []models.Tag         `json:"tags"`
	TodoLists    []models.TodoList    `json:"todo_lists"`
	KanbanBoards []models.KanbanBoard `json:"kanban_boards"`
}

// GET /api/v1/user/export
func ExportUserData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var data TakeoutData

	// 1. Fetch User Theme
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user preferences"})
		return
	}
	data.Theme = user.Theme

	// 2. Fetch Layouts
	var userLayout models.UserLayout
	if err := database.DB.Where("user_id = ?", userID).First(&userLayout).Error; err == nil {
		data.Layouts = userLayout.Layouts
	}

	// 3. Fetch Bookmarks with Tags
	if err := database.DB.Preload("Tags").Where("user_id = ?", userID).Find(&data.Bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}
	// Strip Icons
	for i := range data.Bookmarks {
		data.Bookmarks[i].Icon = ""
	}

	// 4. Fetch Tags
	if err := database.DB.Where("user_id = ?", userID).Find(&data.Tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}

	// 5. Fetch Todo Lists
	if err := database.DB.Preload("Items").Where("user_id = ?", userID).Find(&data.TodoLists).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch todo lists"})
		return
	}

	// 6. Fetch Kanban Boards
	if err := database.DB.Preload("Columns.Cards").Where("user_id = ?", userID).Find(&data.KanbanBoards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch kanban boards"})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=alpaca-takeout.json")
	c.JSON(http.StatusOK, data)
}

// POST /api/v1/user/import
func ImportUserData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// Get File
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	defer file.Close()

	var data TakeoutData
	if err := json.NewDecoder(file).Decode(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}

	tx := database.DB.Begin()

	// 1. Update Theme
	if data.Theme != "" {
		if err := tx.Model(&models.User{}).Where("id = ?", userID).Update("theme", data.Theme).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update theme"})
			return
		}
	}

	// 2. Update Layouts
	if data.Layouts != "" {
		layout := models.UserLayout{
			UserID:  userID,
			Layouts: data.Layouts,
		}
		// Using Create with OnConflict logic manually if needed, or just delete and recreate
		tx.Where("user_id = ?", userID).Delete(&models.UserLayout{})
		if err := tx.Create(&layout).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import layout"})
			return
		}
	}

	// 3. Import Tags first (to build a map for bookmarks)
	tagMap := make(map[string]uint)
	for _, t := range data.Tags {
		var existingTag models.Tag
		if err := tx.Where("name = ? AND user_id = ?", t.Name, userID).First(&existingTag).Error; err != nil {
			newTag := models.Tag{
				Name:   t.Name,
				UserID: userID,
			}
			if err := tx.Create(&newTag).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import tag: " + t.Name})
				return
			}
			tagMap[t.Name] = newTag.ID
		} else {
			tagMap[t.Name] = existingTag.ID
		}
	}

	// 4. Import Bookmarks
	for _, b := range data.Bookmarks {
		var finalTags []models.Tag
		for _, bt := range b.Tags {
			if id, ok := tagMap[bt.Name]; ok {
				finalTags = append(finalTags, models.Tag{ID: id})
			}
		}

		newBookmark := models.Bookmark{
			UserID:      userID,
			URL:         b.URL,
			Title:       b.Title,
			Description: b.Description,
			Tags:        finalTags,
		}
		if err := tx.Create(&newBookmark).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import bookmark: " + b.URL})
			return
		}
	}

	// 5. Import Todo Lists
	for _, tl := range data.TodoLists {
		newList := models.TodoList{
			UserID: userID,
			Title:  tl.Title,
		}
		if err := tx.Create(&newList).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import todo list: " + tl.Title})
			return
		}

		for _, item := range tl.Items {
			newItem := models.TodoItem{
				TodoListID: newList.ID,
				Content:    item.Content,
				Completed:  item.Completed,
				Position:   item.Position,
			}
			if err := tx.Create(&newItem).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import todo item"})
				return
			}
		}
	}

	// 6. Import Kanban Boards
	for _, kb := range data.KanbanBoards {
		newBoard := models.KanbanBoard{
			UserID:      userID,
			Title:       kb.Title,
			Description: kb.Description,
			Position:    kb.Position,
		}
		if err := tx.Create(&newBoard).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import kanban board: " + kb.Title})
			return
		}

		for _, col := range kb.Columns {
			newCol := models.KanbanColumn{
				BoardID:  newBoard.ID,
				Title:    col.Title,
				Color:    col.Color,
				Position: col.Position,
			}
			if err := tx.Create(&newCol).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import kanban column"})
				return
			}

			for _, card := range col.Cards {
				newCard := models.KanbanCard{
					ColumnID:    newCol.ID,
					Title:       card.Title,
					Description: card.Description,
					Position:    card.Position,
				}
				if err := tx.Create(&newCard).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import kanban card"})
					return
				}
			}
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Data imported successfully"})
}
