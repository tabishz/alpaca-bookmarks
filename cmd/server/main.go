package main

import (
	"alpaca-bookmarks/internal/database"
	"alpaca-bookmarks/internal/handlers"
	"alpaca-bookmarks/internal/middleware"
	"alpaca-bookmarks/internal/models"
	"alpaca-bookmarks/internal/services"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
	"golang.org/x/crypto/bcrypt"
)

const Version = "0.1.6-beta"

// Helper function to create initial admin
func createDefaultAdmin() {
	var count int64
	database.DB.Model(&models.User{}).Count(&count)

	if count == 0 {
		fmt.Println("No users found. Creating default admin...")
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)

		admin := models.User{
			Username: "admin",
			Password: string(hashedPassword),
			Role:     "admin",
			Theme:    "dracula",
		}

		if err := database.DB.Create(&admin).Error; err != nil {
			log.Fatal("Failed to create default admin:", err)
		}
		fmt.Println("Default admin created: admin / admin123")
	}
}

func main() {
	log.Printf("Starting Bookmarks Manager %s\n", Version)
	database.Connect()
	createDefaultAdmin()

	// Backup Scheduling
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
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
				"version": Version,
			})
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
			protected.GET("/user/layout", handlers.GetUserLayout)
			protected.PUT("/user/layout", handlers.SaveUserLayout)
			// Bookmarks CRUD
			protected.POST("/bookmarks", handlers.CreateBookmark)
			protected.GET("/bookmarks", handlers.GetBookmarks)
			protected.GET("/bookmarks/:id/icon", handlers.GetBookmarkIcon)
			protected.GET("/tags", handlers.GetAllTags)
			protected.DELETE("/tags/:id", handlers.DeleteTag)
			protected.PUT("/bookmarks/:id", handlers.UpdateBookmark)
			protected.DELETE("/bookmarks/:id", handlers.DeleteBookmark)
			protected.PATCH("/user/password", handlers.UpdatePassword)

			// System Routes
			system := protected.Group("/system")
			{
				system.POST("/import", handlers.ImportBookmarks)
				system.GET("/export", handlers.ExportBookmarks)
				// Nuclear Route
				system.DELETE("/purge", handlers.PurgeData)
			}

			// Admin Group
			admin := protected.Group("/admin")
			admin.Use(middleware.AdminOnly())
			{
				admin.POST("/backup", handlers.TriggerBackup)
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
