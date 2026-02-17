package handlers

import (
	"alpaca-bookmarks/internal/database"
	"alpaca-bookmarks/internal/models"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/html"
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
	// Build the Base Query (Filters Only)
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

	// COUNT TOTAL MATCHES (Before Pagination)
	var count int64
	if err := query.Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count bookmarks"})
		return
	}

	// SET HEADER
	c.Header("X-Total-Count", strconv.FormatInt(count, 10))

	// Run Final Query with Pagination
	// Ensure we sort by "bookmarks.created_at" to avoid ambiguity
	if err := query.Order("bookmarks.created_at desc").Limit(input.Limit).Offset(offset).Find(&bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}

	c.JSON(http.StatusOK, bookmarks)
}

// GET /api/v1/bookmarks/:id
func GetBookmark(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var bookmark models.Bookmark
	if err := database.DB.Preload("Tags").Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	c.JSON(http.StatusOK, bookmark)
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

	// Fetch and store the icon
	icon, err := fetchAndEncodeIcon(bookmark.URL)
	if err == nil {
		bookmark.Icon = icon
	}
	bookmark.IconLastFetched = time.Now()

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

	// Refetch icon if it's older than 30 days
	if time.Since(bookmark.IconLastFetched).Hours() > 24*30 {
		icon, err := fetchAndEncodeIcon(bookmark.URL)
		if err == nil {
			bookmark.Icon = icon
		}
		bookmark.IconLastFetched = time.Now()
	}

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

// GET /api/v1/bookmarks/metadata?url=...
func GetPageMetadata(c *gin.Context) {
	pageURL := c.Query("url")
	if pageURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url parameter is required"})
		return
	}

	client := http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL"})
		return
	}
	req.Header.Set("User-Agent", "Alpaca-Bookmarks/1.0")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch URL"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Server returned status %d", resp.StatusCode)})
		return
	}

	// We only care about HTML
	contentType := resp.Header.Get("Content-Type")
	if !strings.Contains(contentType, "text/html") {
		c.JSON(http.StatusOK, gin.H{"url": pageURL, "title": "", "description": ""})
		return
	}

	title := ""
	description := ""
	doc, err := html.Parse(resp.Body)
	if err == nil {
		title, description = extractMetadata(doc)
	}

	c.JSON(http.StatusOK, gin.H{
		"url":         pageURL,
		"title":       title,
		"description": description,
	})
}

func extractMetadata(n *html.Node) (title, description string) {
	var traverse func(*html.Node)
	traverse = func(n *html.Node) {
		if n.Type == html.ElementNode {
			if n.Data == "title" && title == "" {
				if n.FirstChild != nil {
					title = n.FirstChild.Data
				}
			} else if n.Data == "meta" {
				var name, content string
				for _, attr := range n.Attr {
					if attr.Key == "name" || attr.Key == "property" {
						name = strings.ToLower(attr.Val)
					} else if attr.Key == "content" {
						content = attr.Val
					}
				}
				if (name == "description" || name == "og:description" || name == "twitter:description") && description == "" {
					description = content
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			traverse(c)
		}
	}
	traverse(n)
	return
}

// POST /api/v1/bookmarks/:id/icon
func UpdateBookmarkIconFromURL(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var input struct {
		IconURL string `json:"icon_url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "icon_url is required"})
		return
	}

	var bookmark models.Bookmark
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	// Fetch from custom URL
	icon, err := downloadAndEncodeIcon(input.IconURL)
	if err != nil {
		log.Printf("Icon update failed for bookmark %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	bookmark.Icon = icon
	bookmark.IconLastFetched = time.Now()

	if err := database.DB.Save(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update database record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Icon updated successfully"})
}

func downloadAndEncodeIcon(iconURL string) (string, error) {
	client := http.Client{
		Timeout: 15 * time.Second,
	}
	req, err := http.NewRequest("GET", iconURL, nil)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	// Add User-Agent to avoid being blocked by some CDNs/servers
	req.Header.Set("User-Agent", "Alpaca-Bookmarks/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	iconBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read data: %w", err)
	}

	if len(iconBytes) == 0 {
		return "", fmt.Errorf("file is empty")
	}

	mimeType := http.DetectContentType(iconBytes)
	// Strip charset from mimeType if present (e.g. "text/plain; charset=utf-8")
	if idx := strings.Index(mimeType, ";"); idx != -1 {
		mimeType = mimeType[:idx]
	}

	// Manual override for common SVG cases where detection returns text/plain or text/xml
	lowerURL := strings.ToLower(iconURL)
	if strings.HasSuffix(lowerURL, ".svg") || strings.Contains(lowerURL, ".svg?") || strings.HasPrefix(strings.TrimSpace(string(iconBytes)), "<svg") {
		mimeType = "image/svg+xml"
	}

	base64Encoding := "data:" + mimeType + ";base64," + base64.StdEncoding.EncodeToString(iconBytes)

	return base64Encoding, nil
}

// GET /api/v1/bookmarks/:id/icon
func GetBookmarkIcon(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var bookmark models.Bookmark
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	// If icon is empty or older than 30 days, try to fetch it
	if bookmark.Icon == "" || time.Since(bookmark.IconLastFetched).Hours() > 24*30 {
		icon, err := fetchAndEncodeIcon(bookmark.URL)

		bookmark.IconLastFetched = time.Now() // Always update the timestamp
		if err == nil {
			bookmark.Icon = icon
		} else {
			bookmark.Icon = "" // Clear icon on failure
		}
		database.DB.Save(&bookmark)
	}

	if bookmark.Icon == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Icon not found"})
		return
	}

	// The icon is a full data URI, so we need to split it
	parts := strings.Split(bookmark.Icon, ",")
	if len(parts) != 2 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid icon format"})
		return
	}

	// Decode the base64 part
	data, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode icon"})
		return
	}

	// Get content type from the data URI
	contentType := strings.TrimSuffix(strings.TrimPrefix(parts[0], "data:"), ";base64")

	c.Header("Content-Type", contentType)
	c.Header("Content-Length", strconv.Itoa(len(data)))
	c.Writer.Write(data)
}

func fetchAndEncodeIcon(pageURL string) (string, error) {
	// 1. Construct the Google S2 favicon URL
	parsedURL, err := url.Parse(pageURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse URL: %w", err)
	}
	faviconURL := fmt.Sprintf("https://www.google.com/s2/favicons?domain=%s&sz=128", parsedURL.Host)

	// 2. Fetch the icon
	// Use a timeout to avoid hanging on slow responses
	client := http.Client{
		Timeout: 5 * time.Second,
	}
	resp, err := client.Get(faviconURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch icon: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch icon: status code %d", resp.StatusCode)
	}

	// 3. Read the image data
	iconBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read icon data: %w", err)
	}

	// If the response is empty, return an error
	if len(iconBytes) == 0 {
		return "", fmt.Errorf("fetched icon is empty")
	}

	// 4. Encode to Base64
	// Prepend the data URI scheme
	// This makes it easy to use directly in the `src` attribute of an `<img>` tag
	var base64Encoding string
	mimeType := http.DetectContentType(iconBytes)
	switch mimeType {
	case "image/jpeg":
		base64Encoding = "data:image/jpeg;base64,"
	case "image/png":
		base64Encoding = "data:image/png;base64,"
	case "image/gif":
		base64Encoding = "data:image/gif;base64,"
	case "image/svg+xml":
		base64Encoding = "data:image/svg+xml;base64,"
	case "image/x-icon", "image/vnd.microsoft.icon":
		base64Encoding = "data:image/x-icon;base64,"
	default:
		// default to png if unknown
		base64Encoding = "data:image/png;base64,"
	}

	base64Encoding += base64.StdEncoding.EncodeToString(iconBytes)

	// Check if the base64 string is suspiciously small (e.g., a 1x1 pixel)
	// Google sometimes returns a default blank icon.
	// This is a heuristic and might need adjustment.
	if len(base64Encoding) < 200 { // Adjust this threshold as needed
		// Try a fallback service
		return fetchAndEncodeIconFallback(pageURL)
	}

	return base64Encoding, nil
}

// Fallback favicon fetcher
func fetchAndEncodeIconFallback(pageURL string) (string, error) {
	parsedURL, err := url.Parse(pageURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse URL: %w", err)
	}
	// Example using "icon.horse" as a fallback.
	// Replace with any other service if you prefer.
	faviconURL := fmt.Sprintf("https://icon.horse/icon/%s", parsedURL.Host)

	client := http.Client{
		Timeout: 5 * time.Second,
	}
	resp, err := client.Get(faviconURL)
	if err != nil {
		return "", fmt.Errorf("fallback fetch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fallback fetch failed: status code %d", resp.StatusCode)
	}

	iconBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("fallback read failed: %w", err)
	}

	if len(iconBytes) == 0 {
		return "", fmt.Errorf("fallback icon is empty")
	}

	// Prepend the data URI scheme
	mimeType := http.DetectContentType(iconBytes)
	base64Encoding := "data:" + mimeType + ";base64," + base64.StdEncoding.EncodeToString(iconBytes)

	return base64Encoding, nil
}
