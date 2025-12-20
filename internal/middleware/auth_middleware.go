// internal/middleware/auth.go

package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/models"
	"bookmarks-manager/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		tokenString := parts[1]

		// Parse and Validate
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Ensure this matches the key used in utils.GenerateToken
			return utils.JwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Extract Claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		var userID uint
		switch v := claims["user_id"].(type) {
		case float64:
			userID = uint(v)
		case json.Number:
			id, _ := v.Int64()
			userID = uint(id)
		case string:
			fmt.Println("Warning: user_id is a string")
		default:
			fmt.Printf("Error: user_id is of unexpected type: %T\n", v)
		}

		if userID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token missing valid user_id"})
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}

// AdminOnly ensures the user has the "admin" role
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get UserID from context (set by AuthMiddleware)
		userID, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Fetch User from DB to check Role
		var user models.User
		if err := database.DB.First(&user, userID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		// Check Role
		if user.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			return
		}

		c.Next()
	}
}
