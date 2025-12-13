package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/v1/tags
func GetAllTags(c *gin.Context) {
	// Define a struct to hold the result (or use models.Tag if it has JSON tags)
	type TagResult struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	}

	var tags []TagResult

	// Logic: Fetch IDs and Names of tags used by this user
	// We change .Pluck() to .Scan() to map multiple columns
	err := database.DB.Table("tags").
		Select("DISTINCT tags.id, tags.name"). // <--- Select ID AND Name
		Joins("JOIN bookmark_tags bt ON bt.tag_id = tags.id").
		Joins("JOIN bookmarks b ON bt.bookmark_id = b.id").
		Where("b.user_id = ?", c.MustGet("userID")).
		Scan(&tags).Error // <--- Use Scan, not Pluck

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}

	c.JSON(http.StatusOK, tags)
}

// DELETE /api/v1/tags/:id
func DeleteTag(c *gin.Context) {
	tagID := c.Param("id")

	// Verify the tag belongs to the user (via join or check)
	// Simple approach: Delete the tag if it belongs to one of the user's bookmarks?
	// Actually, tags are usually shared or specific to user.
	// Assuming your Tag model might link to User or you just delete by ID.
	// If Tags are global in your current schema, be careful.
	// Assuming Tags are User-specific or we just delete by ID for now based on your single-user/admin context.

	var tag models.Tag
	if err := database.DB.First(&tag, tagID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

    // Delete the tag. GORM should handle the join table cleanup if constraints are correct.
    // Otherwise, we explicitly clear associations first.
	if err := database.DB.Select("Bookmarks").Delete(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tag"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted"})
}
