package database

import "gorm.io/gorm"

func UserScope(userID uint) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("user_id = ?", userID)
	}
}
