package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm/clause"
)

type LayoutInput struct {
	Layouts string `json:"layouts"`
}

// GET /api/v1/user/layout
func GetUserLayout(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var userLayout models.UserLayout
	if err := database.DB.Where("user_id = ?", userID).First(&userLayout).Error; err != nil {
		// If not found, return empty JSON. Not an error.
		c.JSON(http.StatusOK, gin.H{})
		return
	}

	c.Header("Content-Type", "application/json")
	c.String(http.StatusOK, userLayout.Layouts)
}

// PUT /api/v1/user/layout
func SaveUserLayout(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input LayoutInput

	// We bind the raw JSON body to the Layouts field
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	layout := models.UserLayout{
		UserID:  userID,
		Layouts: input.Layouts,
	}

	// Upsert: On conflict on user_id, update the layouts column
	err := database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"layouts"}),
	}).Create(&layout).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save layout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Layout saved successfully"})
}
