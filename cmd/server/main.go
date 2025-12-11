package main

import (
	"bookmarks-manager/internal/database"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Initialize Database
	database.Connect()

	// 2. Setup Router
	r := gin.Default()

	// 3. Define Basic Routes (Health Check)
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
			"status":  "database connected",
		})
	})

	// 4. Start Server
	// Runs on port 8080 by default
	r.Run(":8080")
}