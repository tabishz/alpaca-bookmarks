package main

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/handlers"
	"bookmarks-manager/internal/middleware" // Import middleware
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	database.Connect()

	r := gin.Default()

	// Public Routes
	api := r.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		// Protected Routes (Group)
		// We will add bookmarks here in the next phase
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// Temporary test route to verify middleware works
			protected.GET("/me", func(c *gin.Context) {
				userID, _ := c.Get("userID")
				c.JSON(http.StatusOK, gin.H{"user_id": userID, "message": "You are authorized!"})
			})
		}
	}

	r.Run(":8080")
}
