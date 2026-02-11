package utils

import (
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Read from Environment Variable
var JwtSecret = []byte(getSecret())

func getSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Stop the server if the secret is missing.
		// This prevents the app from ever running in an insecure state.
		log.Fatal("FATAL: JWT_SECRET environment variable is not set. Application cannot start.")
	}
	return secret
}

// Define a custom error for invalid tokens
var ErrInvalidToken = errors.New("invalid token")

// GenerateToken creates a JWT valid for a specified duration
func GenerateToken(userID uint, lifetime time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp": time.Now().Add(lifetime).Unix(),
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
