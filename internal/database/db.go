package database

import (
	"alpaca-bookmarks/internal/models"
	"log"
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	// Ensure the data directory exists
	// In production (Docker), this path will be /data
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/data.sqlite" // Default Path
	}

	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatal("Failed to create database directory:", err)
	}

	// Connect to SQLite
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-Migrate (Create tables based on structs)
	log.Println("Migrating database schema...")
	err = DB.AutoMigrate(&models.User{}, &models.Bookmark{}, &models.Tag{}, &models.UserLayout{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database connection established and migrated successfully.")
}
