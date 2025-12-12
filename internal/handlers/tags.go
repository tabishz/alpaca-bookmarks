package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/v1/tags
func GetAllTags(c *gin.Context) {
	// Fetch all unique tag names from the tags table
	var tags []string

	// We only want tags that are actually used by this user's bookmarks
	// SQL: SELECT DISTINCT t.name FROM tags t JOIN bookmark_tags bt ON bt.tag_id = t.id JOIN bookmarks b ON bt.bookmark_id = b.id WHERE b.user_id = ?
	err := database.DB.Model(&models.Tag{}).
		Joins("JOIN bookmark_tags bt ON bt.tag_id = tags.id").
		Joins("JOIN bookmarks b ON bt.bookmark_id = b.id").
		Where("b.user_id = ?", c.MustGet("userID")).
		Distinct().Pluck("name", &tags).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}

	c.JSON(http.StatusOK, tags)
}
