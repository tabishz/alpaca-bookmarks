package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// Define a custom error for invalid tokens
var ErrInvalidToken = errors.New("invalid token")

func init() {
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("super_secret_dev_key") // Fallback for local dev
	}
}

// GenerateToken creates a JWT valid for 24 hours
func GenerateToken(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken parses and validates the token string
func ValidateToken(tokenString string) (uint, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtSecret, nil
	})

	if err != nil {
		return 0, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Convert "sub" (which is float64 in JSON) to uint
		if sub, ok := claims["sub"].(float64); ok {
			return uint(sub), nil
		}
	}

	return 0, ErrInvalidToken
}
