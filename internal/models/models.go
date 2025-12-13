package models

import (
	"time"

	"gorm.io/gorm"
)

// Bookmark represents a saved link
type Bookmark struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"index" json:"user_id"`
	URL         string         `gorm:"index;not null" json:"url"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Tags        []Tag          `gorm:"many2many:bookmark_tags;" json:"tags"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete support
}

// Tag represents a category for bookmarks
type Tag struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Name      string     `gorm:"uniqueIndex" json:"name"`
	Bookmarks []Bookmark `gorm:"many2many:bookmark_tags;" json:"-"`
}

type User struct {
	gorm.Model
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Role     string `json:"role" gorm:"default:'user'"`
	Password string `json:"-"`
	CreatedAt    time.Time      `json:"created_at"`
	Theme    string `json:"theme" gorm:"default:'dracula'"`
}
