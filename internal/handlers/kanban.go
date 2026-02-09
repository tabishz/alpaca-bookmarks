package handlers

import (
	"alpaca-bookmarks/internal/database"
	"alpaca-bookmarks/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/v1/kanban/boards
func GetKanbanBoards(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var boards []models.KanbanBoard

	if err := database.DB.Where("user_id = ?", userID).Preload("Columns.Cards").Find(&boards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch kanban boards"})
		return
	}

	c.JSON(http.StatusOK, boards)
}

// POST /api/v1/kanban/boards
func CreateKanbanBoard(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var input struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	board := models.KanbanBoard{
		UserID:      userID,
		Title:       input.Title,
		Description: input.Description,
	}

	if err := database.DB.Create(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create kanban board"})
		return
	}

	c.JSON(http.StatusCreated, board)
}

// GET /api/v1/kanban/boards/:id
func GetKanbanBoard(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var board models.KanbanBoard
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).
		Preload("Columns.Cards").First(&board).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban board not found"})
		return
	}

	c.JSON(http.StatusOK, board)
}

// PUT /api/v1/kanban/boards/:id
func UpdateKanbanBoard(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var board models.KanbanBoard
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&board).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban board not found"})
		return
	}

	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title != nil {
		board.Title = *input.Title
	}
	if input.Description != nil {
		board.Description = *input.Description
	}

	if err := database.DB.Save(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update kanban board"})
		return
	}

	c.JSON(http.StatusOK, board)
}

// DELETE /api/v1/kanban/boards/:id
func DeleteKanbanBoard(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.KanbanBoard{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete kanban board"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban board not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kanban board deleted"})
}

// POST /api/v1/kanban/boards/:id/columns
func CreateKanbanColumn(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	boardID := c.Param("id")

	// Verify board ownership
	var board models.KanbanBoard
	if err := database.DB.Where("id = ? AND user_id = ?", boardID, userID).First(&board).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban board not found"})
		return
	}

	var input struct {
		Title string `json:"title" binding:"required"`
		Color string `json:"color"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get max position to append
	var maxPosition int
	database.DB.Model(&models.KanbanColumn{}).Where("board_id = ?", board.ID).Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)

	column := models.KanbanColumn{
		BoardID:  board.ID,
		Title:    input.Title,
		Color:    input.Color,
		Position: maxPosition + 1,
	}

	if err := database.DB.Create(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create kanban column"})
		return
	}

	c.JSON(http.StatusCreated, column)
}

// PUT /api/v1/kanban/columns/:id
func UpdateKanbanColumn(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	columnID := c.Param("id")

	var column models.KanbanColumn
	// Join with KanbanBoard to check ownership
	if err := database.DB.Joins("JOIN kanban_boards ON kanban_boards.id = kanban_columns.board_id").
		Where("kanban_columns.id = ? AND kanban_boards.user_id = ?", columnID, userID).
		First(&column).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban column not found"})
		return
	}

	var input struct {
		Title    *string `json:"title"`
		Color    *string `json:"color"`
		Position *int    `json:"position"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title != nil {
		column.Title = *input.Title
	}
	if input.Color != nil {
		column.Color = *input.Color
	}
	if input.Position != nil {
		column.Position = *input.Position
	}

	if err := database.DB.Save(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update kanban column"})
		return
	}

	c.JSON(http.StatusOK, column)
}

// DELETE /api/v1/kanban/columns/:id
func DeleteKanbanColumn(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	columnID := c.Param("id")

	// Verify ownership before deleting
	var column models.KanbanColumn
	if err := database.DB.Joins("JOIN kanban_boards ON kanban_boards.id = kanban_columns.board_id").
		Where("kanban_columns.id = ? AND kanban_boards.user_id = ?", columnID, userID).
		First(&column).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban column not found"})
		return
	}

	if err := database.DB.Delete(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete kanban column"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kanban column deleted"})
}

// POST /api/v1/kanban/columns/:id/cards
func CreateKanbanCard(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	columnID := c.Param("id")

	// Verify column ownership
	var column models.KanbanColumn
	if err := database.DB.Joins("JOIN kanban_boards ON kanban_boards.id = kanban_columns.board_id").
		Where("kanban_columns.id = ? AND kanban_boards.user_id = ?", columnID, userID).
		First(&column).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban column not found"})
		return
	}

	var input struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get max position to append
	var maxPosition int
	database.DB.Model(&models.KanbanCard{}).Where("column_id = ?", column.ID).Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)

	card := models.KanbanCard{
		ColumnID:    column.ID,
		Title:       input.Title,
		Description: input.Description,
		Position:    maxPosition + 1,
	}

	if err := database.DB.Create(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create kanban card"})
		return
	}

	c.JSON(http.StatusCreated, card)
}

// PUT /api/v1/kanban/cards/:id
func UpdateKanbanCard(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	cardID := c.Param("id")

	var card models.KanbanCard
	// Join with Column and Board to check ownership
	if err := database.DB.Joins("JOIN kanban_columns ON kanban_columns.id = kanban_cards.column_id").
		Joins("JOIN kanban_boards ON kanban_boards.id = kanban_columns.board_id").
		Where("kanban_cards.id = ? AND kanban_boards.user_id = ?", cardID, userID).
		First(&card).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban card not found"})
		return
	}

	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Position    *int    `json:"position"`
		ColumnID    *uint   `json:"column_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title != nil {
		card.Title = *input.Title
	}
	if input.Description != nil {
		card.Description = *input.Description
	}
	if input.Position != nil {
		card.Position = *input.Position
	}
	if input.ColumnID != nil {
		// Verify the new column belongs to the same user
		var newColumn models.KanbanColumn
		if err := database.DB.Joins("JOIN kanban_boards ON kanban_boards.id = kanban_columns.board_id").
			Where("kanban_columns.id = ? AND kanban_boards.user_id = ?", *input.ColumnID, userID).
			First(&newColumn).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid column"})
			return
		}
		card.ColumnID = *input.ColumnID
	}

	if err := database.DB.Save(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update kanban card"})
		return
	}

	c.JSON(http.StatusOK, card)
}

// DELETE /api/v1/kanban/cards/:id
func DeleteKanbanCard(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	cardID := c.Param("id")

	// Verify ownership before deleting
	var card models.KanbanCard
	if err := database.DB.Joins("JOIN kanban_columns ON kanban_columns.id = kanban_cards.column_id").
		Joins("JOIN kanban_boards ON kanban_boards.id = kanban_columns.board_id").
		Where("kanban_cards.id = ? AND kanban_boards.user_id = ?", cardID, userID).
		First(&card).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kanban card not found"})
		return
	}

	if err := database.DB.Delete(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete kanban card"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kanban card deleted"})
}
