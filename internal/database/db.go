package database

import (
	"alpaca-bookmarks/internal/models"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	// Ensure the data directory exists
	// In production (Docker), this path will be /data
	dbPath := strings.TrimSpace(os.Getenv("DB_PATH"))
	if dbPath == "" {
		dbPath = "./data/data.sqlite" // Default Path
	}

	absPath, _ := filepath.Abs(dbPath)
	log.Printf("Connecting to database at: %s (Absolute: %s)\n", dbPath, absPath)

	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatal("Failed to create database directory:", err)
	}

	// Check if directory is writable
	testFile := filepath.Join(dir, ".perm_test")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		log.Printf("WARNING: Database directory %s might not be writable: %v\n", dir, err)
	} else {
		os.Remove(testFile)
	}

	// Connect to SQLite
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Enable Foreign Keys for SQLite (Important for CASCADE)
	DB.Exec("PRAGMA foreign_keys = ON;")

	// Auto-Migrate (Create tables based on structs)

	log.Println("Migrating database schema...")
	err = DB.AutoMigrate(&models.User{}, &models.Bookmark{}, &models.Tag{}, &models.UserLayout{}, &models.TodoList{}, &models.TodoItem{}, &models.KanbanBoard{}, &models.KanbanColumn{}, &models.KanbanCard{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database connection established and migrated successfully.")
}
