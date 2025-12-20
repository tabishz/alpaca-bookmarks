package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"net/http"
	"strconv"

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

  var input struct {
    Page   int    `form:"page,default=1"`
    Limit  int    `form:"limit,default=50"`
    Search string `form:"search"`
    Tag    string `form:"tag"`
  }

  if err := c.ShouldBindQuery(&input); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
    return
  }

  offset := (input.Page - 1) * input.Limit

  var bookmarks []models.Bookmark
  // 1. Build the Base Query (Filters Only)
  query := database.DB.Model(&models.Bookmark{}).Preload("Tags").Where("bookmarks.user_id = ?", userID)

  // Tag Logic
  if input.Tag == "Untagged" {
    query = query.Joins("LEFT JOIN bookmark_tags bt ON bt.bookmark_id = bookmarks.id").Where("bt.tag_id IS NULL")
  } else if input.Tag != "" {
    // FIX: Just to be safe, we ensure the joined tag also belongs to the user,
    // though the bookmark->tag link should implicitly handle this.
    query = query.Joins("JOIN bookmark_tags bt ON bt.bookmark_id = bookmarks.id").
                  Joins("JOIN tags t ON bt.tag_id = t.id").
                  Where("t.name = ?", input.Tag)
  }

  // Search Logic
  if input.Search != "" {
    search := "%" + input.Search + "%"
    query = query.Where("(bookmarks.title LIKE ? OR bookmarks.url LIKE ?)", search, search)
  }

  // 2. COUNT TOTAL MATCHES (Before Pagination)
  var count int64
  if err := query.Count(&count).Error; err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count bookmarks"})
    return
  }

  // 3. SET HEADER
  c.Header("X-Total-Count", strconv.FormatInt(count, 10))

  // 4. Run Final Query with Pagination
  // Ensure we sort by "bookmarks.created_at" to avoid ambiguity
  if err := query.Order("bookmarks.created_at desc").Limit(input.Limit).Offset(offset).Find(&bookmarks).Error; err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
    return
  }

  c.JSON(http.StatusOK, bookmarks)
}

// POST /api/v1/bookmarks
func CreateBookmark(c *gin.Context) {
  userID := c.MustGet("userID").(uint)
  var input models.BookmarkInput
  if err := c.ShouldBindJSON(&input); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

  // Process Tags (Use explicit UserID check)
  var tags []models.Tag
  for _, tagName := range input.Tags {
    var tag models.Tag
    // Correctly finding tag for THIS user
    if err := database.DB.Where("name = ? AND user_id = ?", tagName, userID).First(&tag).Error; err != nil {
      tag = models.Tag{
        Name:   tagName,
        UserID: userID,
      }
      database.DB.Create(&tag)
    }
    tags = append(tags, tag)
  }

  // Create Bookmark
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
  // Ensure user owns the bookmark being updated
  if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
    c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
    return
  }

  var input models.BookmarkInput
  if err := c.ShouldBindJSON(&input); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

  // Update basic fields
  bookmark.URL = input.URL
  bookmark.Title = input.Title
  bookmark.Description = input.Description

  var tags []models.Tag
  for _, tagName := range input.Tags {
    var tag models.Tag

    // Check if tag exists FOR THIS USER
    err := database.DB.Where("name = ? AND user_id = ?", tagName, userID).First(&tag).Error

    if err != nil {
        // Create new tag for this user
        tag = models.Tag{
            Name:   tagName,
            UserID: userID,
        }
        database.DB.Create(&tag)
    }
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
