package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/v1/tags
func GetAllTags(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var tags []models.Tag

	if err := database.DB.Where("user_id = ?", userID).Find(&tags).Error; err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
    return
  }

  c.JSON(http.StatusOK, tags)
}

// DELETE /api/v1/tags/:id
func DeleteTag(c *gin.Context) {
  tagID := c.Param("id")
  userID := c.MustGet("userID").(uint)

  // SECURITY CHECK:
  // We add "AND user_id = ?" to ensure User A cannot delete User B's tag.
  // We use Unscoped() to permanently delete it, or remove it if you prefer soft delete.
  result := database.DB.Where("id = ? AND user_id = ?", tagID, userID).Delete(&models.Tag{})

  if result.Error != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tag"})
    return
  }

  // If RowsAffected is 0, it means the tag didn't exist OR it belonged to another user
  if result.RowsAffected == 0 {
    c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found or unauthorized"})
    return
  }

  // Optional: Clean up the relation in the join table
  // GORM usually handles this, but explicit cleanup is safe
  database.DB.Exec("DELETE FROM bookmark_tags WHERE tag_id = ?", tagID)

  c.JSON(http.StatusOK, gin.H{"message": "Tag deleted"})
}
