package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Input struct for creating/updating a bookmark
type BookmarkInput struct {
	URL         string   `json:"url" binding:"required"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"` // List of tag names (e.g. ["tech", "news"])
}

// GET /api/v1/bookmarks
func GetBookmarks(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// 1. DEFINE THE INPUT STRUCT (Add this part)
	var input struct {
		Page   int    `form:"page,default=1"`
		Limit  int    `form:"limit,default=50"`
		Search string `form:"search"`
		Tag    string `form:"tag"`
	}

	// 2. BIND QUERY PARAMETERS (Add this part)
	// This reads ?page=1&limit=50&tag=css into the 'input' variable
	if err := c.ShouldBindQuery(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	// Calculate offset for pagination
	offset := (input.Page - 1) * input.Limit

	var bookmarks []models.Bookmark
	query := database.DB.Model(&models.Bookmark{}).Preload("Tags").Where("bookmarks.user_id = ?", userID)

	if input.Tag == "Untagged" {
		// SPECIAL CASE: Filter for bookmarks that have NO tags
		// We use a LEFT JOIN and check for NULL on the right side
		query = query.Joins("LEFT JOIN bookmark_tags bt ON bt.bookmark_id = bookmarks.id").
			Where("bt.tag_id IS NULL")

	} else if input.Tag != "" {
		// STANDARD CASE: Filter for a specific tag
		query = query.Joins("JOIN bookmark_tags bt ON bt.bookmark_id = bookmarks.id").
			Joins("JOIN tags t ON bt.tag_id = t.id").
			Where("t.name = ?", input.Tag)
	}

	if input.Search != "" {
		search := "%" + input.Search + "%"
		query = query.Where("(bookmarks.title LIKE ? OR bookmarks.url LIKE ?)", search, search)
	}

	// FIX: Use 'bookmarks.created_at' to avoid ambiguity
	if err := query.Order("bookmarks.created_at desc").Limit(input.Limit).Offset(offset).Find(&bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}

	c.JSON(http.StatusOK, bookmarks)
}

// POST /api/v1/bookmarks
func CreateBookmark(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var input BookmarkInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Process Tags (Find or Create)
	var tags []models.Tag
	for _, tagName := range input.Tags {
		var tag models.Tag
		// FirstOrCreate finds by 'name', creates if not found
		if err := database.DB.FirstOrCreate(&tag, models.Tag{Name: tagName}).Error; err != nil {
			continue // Skip invalid tags if any
		}
		tags = append(tags, tag)
	}

	// 2. Create Bookmark
	bookmark := models.Bookmark{
		UserID:      userID,
		URL:         input.URL,
		Title:       input.Title,
		Description: input.Description,
		Tags:        tags,
	}

	if err := database.DB.Create(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save bookmark"})
		return
	}

	c.JSON(http.StatusCreated, bookmark)
}

// PUT /api/v1/bookmarks/:id
func UpdateBookmark(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var bookmark models.Bookmark
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	var input BookmarkInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update basic fields
	bookmark.URL = input.URL
	bookmark.Title = input.Title
	bookmark.Description = input.Description

	// Update Tags (Replace existing association)
	var tags []models.Tag
	for _, tagName := range input.Tags {
		var tag models.Tag
		database.DB.FirstOrCreate(&tag, models.Tag{Name: tagName})
		tags = append(tags, tag)
	}

	// Use GORM association mode to replace tags
	if err := database.DB.Model(&bookmark).Association("Tags").Replace(tags); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tags"})
		return
	}

	// Save main fields
	database.DB.Save(&bookmark)
	c.JSON(http.StatusOK, bookmark)
}

// DELETE /api/v1/bookmarks/:id
func DeleteBookmark(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	// Verify ownership before deleting
	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Bookmark{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmark"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bookmark deleted"})
}
