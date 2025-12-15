package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"bookmarks-manager/internal/services"
	"bookmarks-manager/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// POST /api/v1/system/import
func ImportBookmarks(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// 1. Get File
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	defer file.Close()

	// 2. Parse HTML
	// Ensure your utils.ParseBookmarksHTML accepts userID and sets it on the bookmarks
	bookmarks, err := utils.ParseBookmarksHTML(file, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse bookmark file"})
		return
	}

	// 3. Save to Database
	count := 0
	for _, b := range bookmarks {
		// Ensure the bookmark itself is owned by the user
		b.UserID = userID

		// --- FIX STARTS HERE ---
		// Process Tags with User Scope
		var finalTags []models.Tag
		for _, t := range b.Tags {
			var tag models.Tag

			// Check if THIS user already has this tag
			err := database.DB.Where("name = ? AND user_id = ?", t.Name, userID).First(&tag).Error

			if err != nil {
				// Tag doesn't exist for this user, create it properly
				tag = models.Tag{
					Name:   t.Name,
					UserID: userID, // <--- Crucial: Set the Owner
				}
				database.DB.Create(&tag)
			}
			finalTags = append(finalTags, tag)
		}
		b.Tags = finalTags
		// --- FIX ENDS HERE ---

		// Create Bookmark
		if err := database.DB.Create(&b).Error; err == nil {
			count++
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Import successful", "imported_count": count})
}

// GET /api/v1/system/export
func ExportBookmarks(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// Fetch only THIS user's bookmarks
	var bookmarks []models.Bookmark
	if err := database.DB.Preload("Tags").Where("user_id = ?", userID).Find(&bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch data"})
		return
	}

	htmlContent := utils.GenerateBookmarksHTML(bookmarks)

	c.Header("Content-Disposition", "attachment; filename=bookmarks.html")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(htmlContent))
}

// POST /api/v1/system/backup
func TriggerBackup(c *gin.Context) {
	// Only Admins should ideally trigger this, but we'll leave it as is for now
	go func() {
		if err := services.PerformBackup(); err != nil {
			println("Backup failed:", err.Error())
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Backup process started in background"})
}

// DELETE /api/v1/system/purge
func PurgeData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	tx := database.DB.Begin()

	// 1. Delete Associations (Bookmark <-> Tags) for this user's bookmarks
	if err := tx.Exec("DELETE FROM bookmark_tags WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ?)", userID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear associations"})
		return
	}

	// 2. Delete Bookmarks
	if err := tx.Where("user_id = ?", userID).Delete(&models.Bookmark{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmarks"})
		return
	}

	// 3. Delete THIS USER'S unused tags
	// (Only delete tags that belong to the user AND have no remaining bookmarks)
	if err := tx.Where("user_id = ? AND id NOT IN (SELECT tag_id FROM bookmark_tags)", userID).Delete(&models.Tag{}).Error; err != nil {
		// Log warning but don't fail transaction for this
		println("Warning: Failed to cleanup unused tags")
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Nuclear option executed. All bookmarks wiped."})
}
