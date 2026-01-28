package services

import (
	"alpaca-bookmarks/internal/database"
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

/**
export AWS_ACCESS_KEY_ID=your_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
export S3_BUCKET_NAME=your-unique-bucket-name
**/

// PerformBackup creates a hot backup of SQLite and uploads it to S3
func PerformBackup() error {
	bucket := os.Getenv("S3_BUCKET_NAME")
	if bucket == "" {
		return fmt.Errorf("S3_BUCKET_NAME is not set, skipping backup")
	}

	// Create a "Hot" Backup of SQLite
	// "VACUUM INTO" is the thread-safe way to backup SQLite while it's running
	backupFile := fmt.Sprintf("backup_%d.sqlite", time.Now().Unix())
	tempPath := "/tmp/" + backupFile // specific to Linux/Container env

	// Execute Raw SQL via GORM
	err := database.DB.Exec("VACUUM INTO ?", tempPath).Error
	if err != nil {
		return fmt.Errorf("failed to snapshot database: %v", err)
	}
	defer os.Remove(tempPath) // Cleanup temp file after upload

	// Initialize S3 Client
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %v", err)
	}
	client := s3.NewFromConfig(cfg)

	// Open the file
	f, err := os.Open(tempPath)
	if err != nil {
		return err
	}
	defer f.Close()

	// Upload to S3
	objectKey := fmt.Sprintf("backups/%s", backupFile)
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(objectKey),
		Body:   f,
	})

	if err != nil {
		return fmt.Errorf("failed to upload to S3: %v", err)
	}

	log.Printf("Backup successful: s3://%s/%s", bucket, objectKey)
	return nil
}
