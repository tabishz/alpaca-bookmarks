package main

import (
	"bookmarks-manager/internal/database"
	"bookmarks-manager/internal/handlers"
	"bookmarks-manager/internal/middleware"
	"bookmarks-manager/internal/services"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
)

func main() {
	database.Connect()

	// --- 1. Setup Scheduler ---
	c := cron.New()
	// Run every day at midnight. Cron syntax: "0 0 * * *"
	// For testing, you can use "@every 1m" to see it work immediately
	schedule := os.Getenv("BACKUP_SCHEDULE")
	if schedule == "" {
		schedule = "@daily"
	}

	_, err := c.AddFunc(schedule, func() {
		log.Println("Starting scheduled backup...")
		if err := services.PerformBackup(); err != nil {
			log.Printf("Scheduled backup failed: %v\n", err)
		}
	})
	if err != nil {
		log.Fatal("Failed to start cron scheduler:", err)
	}
	c.Start()
	// --------------------------

	r := gin.Default()

	api := r.Group("/api/v1")
	{
		// Global Health Check
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})
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
			protected.PATCH("/user/preferences", handlers.UpdatePreferences)
			// Bookmarks CRUD
			protected.POST("/bookmarks", handlers.CreateBookmark)
			protected.GET("/bookmarks", handlers.GetBookmarks)
			protected.GET("/tags", handlers.GetAllTags)
			protected.PUT("/bookmarks/:id", handlers.UpdateBookmark)
			protected.DELETE("/bookmarks/:id", handlers.DeleteBookmark)

			// System Routes
			system := protected.Group("/system")
			{
				system.POST("/import", handlers.ImportBookmarks)
				system.GET("/export", handlers.ExportBookmarks)
				system.POST("/backup", handlers.TriggerBackup)
				// Nuclear Route
				system.DELETE("/purge", handlers.PurgeData)
			}

			// Admin Group
			admin := protected.Group("/admin")
			admin.Use(middleware.AdminOnly())
			{
					admin.GET("/users", handlers.GetAllUsers)
					admin.POST("/users", handlers.CreateUser)
					admin.DELETE("/users/:id", handlers.DeleteUser)
					admin.PATCH("/users/:id/reset-password", handlers.ResetUserPassword)
					admin.PATCH("/users/:id/role", handlers.UpdateUserRole)
			}
		}
	}

	r.Run(":8080")
}
