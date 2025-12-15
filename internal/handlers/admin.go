package handlers

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GET /api/v1/admin/users
func GetAllUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// POST /api/v1/admin/users
func CreateUser(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	// Validate Role (Prevent garbage roles)
	role := input.Role
	if role != "admin" && role != "user" {
		role = "user" // Fallback to standard user
	}

	user := models.User{Username: input.Username, Password: string(hashedPassword), Role: role}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created", "user": user})
}

// DELETE /api/v1/admin/users/:id
func DeleteUser(c *gin.Context) {
	idStr := c.Param("id")

	// 1. Safety Check: Prevent self-deletion
	currentUserID := c.MustGet("userID").(uint)
	if idStr == fmt.Sprintf("%d", currentUserID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot delete your own account"})
		return
	}

	// 2. Start a Transaction to ensure clean deletion
	tx := database.DB.Begin()

	// A. Clean up the JOIN table (bookmark_tags)
	// We must delete entries where the bookmark belongs to this user.
	// SQL: DELETE FROM bookmark_tags WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ?)
	if err := tx.Exec("DELETE FROM bookmark_tags WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ?)", idStr).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clean up bookmark tags"})
		return
	}

	// B. Delete User's Bookmarks
	if err := tx.Where("user_id = ?", idStr).Delete(&models.Bookmark{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmarks"})
		return
	}

	// C. Delete User's Tags (Since tags are now user-scoped)
	if err := tx.Where("user_id = ?", idStr).Delete(&models.Tag{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tags"})
		return
	}

	// D. Finally, Delete the User
	if err := tx.Delete(&models.User{}, idStr).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "User and all associated data deleted"})
}

// PATCH /api/v1/admin/users/:id/reset-password
func ResetUserPassword(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		NewPassword string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password required"})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	if err := database.DB.Model(&models.User{}).Where("id = ?", id).Update("password", string(hashedPassword)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successful"})
}

// PATCH /api/v1/admin/users/:id/role
func UpdateUserRole(c *gin.Context) {
	idStr := c.Param("id")

	// Safety: Prevent admin from demoting themselves
	currentUserID := c.MustGet("userID").(uint)
	if idStr == fmt.Sprintf("%d", currentUserID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot change your own role"})
		return
	}

	var input struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role is required"})
		return
	}

	if input.Role != "admin" && input.Role != "user" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", idStr).Update("role", input.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role updated"})
}
