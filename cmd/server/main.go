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

const Version = "0.3.5-beta"

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
		fmt.Println("Default admin created: admin / admin")
	}
}

func main() {
	log.Printf("Starting Bookmarks Manager %s\n", Version)
	database.Connect()
	createDefaultAdmin()

	// Backup Scheduling
	c := cron.New()
	// Run every day at midnight. Cron syntax: "0 0 * * *"
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

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		SkipPaths: []string{"/api/v1/ping"},
	}))

	// Serve Static Files (Frontend)
	// We check for the existence of /app/dist to see if we're in the Docker container
	distPath := "./frontend/dist"
	if _, err := os.Stat("/app/dist"); err == nil {
		distPath = "/app/dist"
	}
	r.Static("/assets", fmt.Sprintf("%s/assets", distPath))
	r.StaticFile("/favicon.ico", fmt.Sprintf("%s/favicon.ico", distPath))
	r.StaticFile("/manifest.json", fmt.Sprintf("%s/manifest.json", distPath))
	r.StaticFile("/alpaca-bookmarks.png", fmt.Sprintf("%s/alpaca-bookmarks.png", distPath))

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
			protected.GET("/user/export", handlers.ExportUserData)
			protected.POST("/user/import", handlers.ImportUserData)
			protected.GET("/system/config", handlers.GetSystemConfig)
			// Bookmarks CRUD
			protected.POST("/bookmarks", handlers.CreateBookmark)
			protected.GET("/bookmarks", handlers.GetBookmarks)
			protected.GET("/bookmarks/:id", handlers.GetBookmark)
			protected.GET("/bookmarks/metadata", handlers.GetPageMetadata)
			protected.GET("/bookmarks/:id/icon", handlers.GetBookmarkIcon)
			protected.POST("/bookmarks/:id/icon", handlers.UpdateBookmarkIconFromURL)
			protected.GET("/tags", handlers.GetAllTags)
			protected.DELETE("/tags/:id", handlers.DeleteTag)
			protected.PUT("/bookmarks/:id", handlers.UpdateBookmark)
			protected.DELETE("/bookmarks/:id", handlers.DeleteBookmark)
			protected.PATCH("/user/password", handlers.UpdatePassword)

			// Todo Routes
			protected.GET("/todos", handlers.GetTodoLists)
			protected.POST("/todos", handlers.CreateTodoList)
			protected.PUT("/todos/:id", handlers.UpdateTodoList)
			protected.DELETE("/todos/:id", handlers.DeleteTodoList)
			protected.POST("/todos/:id/items", handlers.CreateTodoItem)
			protected.PATCH("/todos/items/:itemId", handlers.UpdateTodoItem)
			protected.DELETE("/todos/items/:itemId", handlers.DeleteTodoItem)

			// Kanban Routes
			protected.GET("/kanban/boards", handlers.GetKanbanBoards)
			protected.POST("/kanban/boards", handlers.CreateKanbanBoard)
			protected.GET("/kanban/boards/:id", handlers.GetKanbanBoard)
			protected.PUT("/kanban/boards/:id", handlers.UpdateKanbanBoard)
			protected.DELETE("/kanban/boards/:id", handlers.DeleteKanbanBoard)
			protected.POST("/kanban/boards/:id/columns", handlers.CreateKanbanColumn)
			protected.PUT("/kanban/columns/:id", handlers.UpdateKanbanColumn)
			protected.DELETE("/kanban/columns/:id", handlers.DeleteKanbanColumn)
			protected.POST("/kanban/columns/:id/cards", handlers.CreateKanbanCard)
			protected.PUT("/kanban/cards/:id", handlers.UpdateKanbanCard)
			protected.DELETE("/kanban/cards/:id", handlers.DeleteKanbanCard)

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

	// Fallback to index.html for SPA routing
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// If it's an API request or an asset request that reached here, it's a 404
		if len(path) >= 4 && path[:4] == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
			return
		}
		
		// For everything else, serve index.html (SPA routing)
		c.File(fmt.Sprintf("%s/index.html", distPath))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
