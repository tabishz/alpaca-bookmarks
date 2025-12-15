package utils

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var JwtSecret = []byte(os.Getenv("JWT_SECRET"))

// Define a custom error for invalid tokens
var ErrInvalidToken = errors.New("invalid token")

func init() {
	if len(JwtSecret) == 0 {
		JwtSecret = []byte("super_secret_dev_key") // Fallback for local dev
	}
}

// GenerateToken creates a JWT valid for 24 hours
func GenerateToken(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtSecret)
}

// ValidateToken parses and validates the token string
func ValidateToken(tokenString string) (uint, error) {
	// Parse the token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method is what we expect (HMAC)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return JwtSecret, nil
	})

	if err != nil {
		return 0, err
	}

	// Validate Claims and Extract UserID
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Look for "user_id" (Make sure GenerateToken uses this same key!)
		if floatID, ok := claims["user_id"].(float64); ok {
			return uint(floatID), nil
		}
	}

	return 0, errors.New("invalid token claims")
}
