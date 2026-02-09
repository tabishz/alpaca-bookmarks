package handlers

import (
	"alpaca-bookmarks/internal/database"
	"alpaca-bookmarks/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/v1/todos
func GetTodoLists(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var lists []models.TodoList

	if err := database.DB.Where("user_id = ?", userID).Preload("Items").Find(&lists).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch todo lists"})
		return
	}

	c.JSON(http.StatusOK, lists)
}

// POST /api/v1/todos
func CreateTodoList(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var input struct {
		Title string `json:"title" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	list := models.TodoList{
		UserID: userID,
		Title:  input.Title,
	}

	if err := database.DB.Create(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create todo list"})
		return
	}

	c.JSON(http.StatusCreated, list)
}

// PUT /api/v1/todos/:id
func UpdateTodoList(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var list models.TodoList
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&list).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo list not found"})
		return
	}

	var input struct {
		Title string `json:"title" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	list.Title = input.Title
	database.DB.Save(&list)

	c.JSON(http.StatusOK, list)
}

// DELETE /api/v1/todos/:id
func DeleteTodoList(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.TodoList{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete todo list"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo list not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Todo list deleted"})
}

// POST /api/v1/todos/:id/items
func CreateTodoItem(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	listID := c.Param("id")

	// Verify list ownership
	var list models.TodoList
	if err := database.DB.Where("id = ? AND user_id = ?", listID, userID).First(&list).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo list not found"})
		return
	}

	var input struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get max position to append
	var maxPosition int
	database.DB.Model(&models.TodoItem{}).Where("todo_list_id = ?", list.ID).Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)

	item := models.TodoItem{
		TodoListID: list.ID,
		Content:    input.Content,
		Position:   maxPosition + 1,
	}

	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create todo item"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// PATCH /api/v1/todos/items/:itemId
func UpdateTodoItem(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	itemID := c.Param("itemId")

	var item models.TodoItem
	// Join with TodoList to check ownership
	if err := database.DB.Joins("JOIN todo_lists ON todo_lists.id = todo_items.todo_list_id").
		Where("todo_items.id = ? AND todo_lists.user_id = ?", itemID, userID).
		First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo item not found"})
		return
	}

	var input struct {
		Content   *string `json:"content"`
		Completed *bool   `json:"completed"`
		Position  *int    `json:"position"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Content != nil {
		item.Content = *input.Content
	}
	if input.Completed != nil {
		item.Completed = *input.Completed
	}
	if input.Position != nil {
		item.Position = *input.Position
	}

	database.DB.Save(&item)
	c.JSON(http.StatusOK, item)
}

// DELETE /api/v1/todos/items/:itemId
func DeleteTodoItem(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	itemID := c.Param("itemId")

	// Verify ownership before deleting
	var item models.TodoItem
	if err := database.DB.Joins("JOIN todo_lists ON todo_lists.id = todo_items.todo_list_id").
		Where("todo_items.id = ? AND todo_lists.user_id = ?", itemID, userID).
		First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo item not found"})
		return
	}

	if err := database.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete todo item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Todo item deleted"})
}
