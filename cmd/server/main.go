package main

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/handlers"
	"bookmarks-manager/internal/middleware"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	database.Connect()

	r := gin.Default()

	api := r.Group("/api/v1")
	{
		// Auth Routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		// Protected Routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/me", func(c *gin.Context) {
				userID, _ := c.Get("userID")
				c.JSON(http.StatusOK, gin.H{"user_id": userID})
			})
			// --- System Routes ---
			system := protected.Group("/system")
			{
				system.POST("/import", handlers.ImportBookmarks)
				system.GET("/export", handlers.ExportBookmarks)
			}

			// --- New Bookmark Routes ---
			protected.GET("/bookmarks", handlers.GetBookmarks)
			protected.POST("/bookmarks", handlers.CreateBookmark)
			protected.PUT("/bookmarks/:id", handlers.UpdateBookmark)
			protected.DELETE("/bookmarks/:id", handlers.DeleteBookmark)
		}
	}

	r.Run(":8080")
}