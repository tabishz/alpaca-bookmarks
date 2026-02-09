package models

import (
	"time"

	"gorm.io/gorm"
)

// Bookmark represents a saved link
type Bookmark struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	UserID          uint           `gorm:"index" json:"user_id"`
	URL             string         `gorm:"index;not null" json:"url"`
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	Icon            string         `json:"icon"`
	IconLastFetched time.Time      `json:"icon_last_fetched"`
	Tags            []Tag          `gorm:"many2many:bookmark_tags;" json:"tags"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete support
}

type BookmarkInput struct {
	URL         string   `json:"url" binding:"required"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"`
	Tags        []string `json:"tags"` // List of tag names (e.g. ["tech", "news"])
}

// Tag represents a category for bookmarks
type Tag struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Name      string     `gorm:"index" json:"name"`
	UserID    uint       `gorm:"index" json:"user_id"`
	Bookmarks []Bookmark `gorm:"many2many:bookmark_tags;" json:"-"`
}

type User struct {
	gorm.Model
	Username  string    `gorm:"uniqueIndex;not null" json:"username"`
	Role      string    `json:"role" gorm:"default:'user'"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	Theme     string    `json:"theme" gorm:"default:'dracula'"`
}

// UserLayout stores the layout of the favorites dashboard for a user
type UserLayout struct {
	ID      uint   `gorm:"primaryKey"`
	UserID  uint   `gorm:"uniqueIndex;not null"`
	Layouts string `gorm:"type:json"` // Store layouts as a JSON string
}

// TodoList represents a collection of todo items for a user
type TodoList struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index" json:"user_id"`
	Title     string         `json:"title"`
	Items     []TodoItem     `gorm:"foreignKey:TodoListID;constraint:OnDelete:CASCADE;" json:"items"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TodoItem represents a single task in a todo list
type TodoItem struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	TodoListID uint           `gorm:"index" json:"todo_list_id"`
	Content    string         `json:"content"`
	Completed  bool           `gorm:"default:false" json:"completed"`
	Position   int            `json:"position"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// KanbanBoard represents a kanban board for a user
type KanbanBoard struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"index" json:"user_id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Columns     []KanbanColumn `gorm:"foreignKey:BoardID;constraint:OnDelete:CASCADE;" json:"columns"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// KanbanColumn represents a column in a kanban board
type KanbanColumn struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	BoardID   uint           `gorm:"index" json:"board_id"`
	Title     string         `json:"title"`
	Color     string         `json:"color"`
	Position  int            `json:"position"`
	Cards     []KanbanCard   `gorm:"foreignKey:ColumnID;constraint:OnDelete:CASCADE;" json:"cards"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// KanbanCard represents a card in a kanban column
type KanbanCard struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ColumnID    uint           `gorm:"index" json:"column_id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Position    int            `json:"position"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
