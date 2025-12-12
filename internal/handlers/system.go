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

	// 1. Get File from Multipart Form
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	defer file.Close()

	// 2. Parse HTML
	bookmarks, err := utils.ParseBookmarksHTML(file, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse bookmark file"})
		return
	}

	// 3. Save to Database (Batch Insert recommended for speed)
	// For simplicity, we loop. In production, use GORM Batch Create.
	count := 0
	for _, b := range bookmarks {
		// Process Tags
		var finalTags []models.Tag
		for _, t := range b.Tags {
			var tag models.Tag
			database.DB.FirstOrCreate(&tag, models.Tag{Name: t.Name})
			finalTags = append(finalTags, tag)
		}
		b.Tags = finalTags

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

	// 1. Fetch all user bookmarks with tags
	var bookmarks []models.Bookmark
	if err := database.DB.Preload("Tags").Where("user_id = ?", userID).Find(&bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch data"})
		return
	}

	// 2. Generate HTML
	htmlContent := utils.GenerateBookmarksHTML(bookmarks)

	// 3. Serve File
	c.Header("Content-Disposition", "attachment; filename=bookmarks.html")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(htmlContent))
}

// POST /api/v1/system/backup
func TriggerBackup(c *gin.Context) {
	// Run in a goroutine so the API response isn't blocked by the upload speed
	go func() {
		if err := services.PerformBackup(); err != nil {
			// In production, you might log this to a monitoring system
			println("Backup failed:", err.Error())
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Backup process started in background"})
}

// DELETE /api/v1/system/purge
func PurgeData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// 1. Delete all bookmarks for this user
	// (Cascading delete in SQLite should handle bookmark_tags,
	// but GORM sometimes needs manual help depending on configuration.
	// We will be explicit to be safe.)

	tx := database.DB.Begin()

	// Delete associations first
	if err := tx.Exec("DELETE FROM bookmark_tags WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ?)", userID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear associations"})
		return
	}

	// Delete bookmarks
	if err := tx.Where("user_id = ?", userID).Delete(&models.Bookmark{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmarks"})
		return
	}

	// Optional: Clean up unused tags (Tags that have no bookmarks)
	// This keeps the DB clean
	tx.Exec("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM bookmark_tags)")

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Nuclear option executed. All bookmarks wiped."})
}
