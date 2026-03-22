package services

import (
	"alpaca-bookmarks/internal/database"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type BackupRetentionConfig struct {
	Daily   int
	Weekly  int
	Monthly int
}

func getRetentionConfig() BackupRetentionConfig {
	daily, _ := strconv.Atoi(os.Getenv("BACKUP_RETENTION_DAILY"))
	weekly, _ := strconv.Atoi(os.Getenv("BACKUP_RETENTION_WEEKLY"))
	monthly, _ := strconv.Atoi(os.Getenv("BACKUP_RETENTION_MONTHLY"))

	if daily == 0 {
		daily = 7
	}
	if weekly == 0 {
		weekly = 4
	}
	if monthly == 0 {
		monthly = 12
	}

	return BackupRetentionConfig{
		Daily:   daily,
		Weekly:  weekly,
		Monthly: monthly,
	}
}

func getS3Client() (*s3.Client, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %v", err)
	}

	endpointURL := os.Getenv("S3_ENDPOINT_URL")
	if endpointURL != "" {
		return s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.EndpointResolver = s3.EndpointResolverFromURL(endpointURL)
			o.UsePathStyle = true
		}), nil
	}

	return s3.NewFromConfig(cfg), nil
}

func listBackups(client *s3.Client, bucket string) ([]types.Object, error) {
	paginator := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String("backups/"),
	})

	var backups []types.Object
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(context.TODO())
		if err != nil {
			return nil, err
		}
		backups = append(backups, page.Contents...)
	}

	return backups, nil
}

func parseBackupTimestamp(key string) (time.Time, error) {
	var timestamp int64
	// Try .sqlite.gz first
	if strings.HasSuffix(key, ".gz") {
		_, err := fmt.Sscanf(key, "backups/backup_%d.sqlite.gz", &timestamp)
		if err == nil {
			return time.Unix(timestamp, 0), nil
		}
	}
	// Then try .sqlite
	_, err := fmt.Sscanf(key, "backups/backup_%d.sqlite", &timestamp)
	if err != nil {
		return time.Time{}, err
	}
	return time.Unix(timestamp, 0), nil
}

func isFirstDayOfMonth(t time.Time) bool {
	return t.Day() == 1
}

func isFirstDayOfWeek(t time.Time) bool {
	return t.Weekday() == time.Sunday
}

func determineBackupsToKeep(backups []types.Object, config BackupRetentionConfig) map[string]bool {
	now := time.Now()
	keep := make(map[string]bool)

	type backupEntry struct {
		Key       string
		Timestamp time.Time
	}

	var dailyBackups []backupEntry
	var weeklyBackups []backupEntry
	var monthlyBackups []backupEntry

	for _, obj := range backups {
		timestamp, err := parseBackupTimestamp(*obj.Key)
		if err != nil {
			continue
		}

		age := now.Sub(timestamp)
		if age < 0 {
			continue
		}

		entry := backupEntry{Key: *obj.Key, Timestamp: timestamp}

		if isFirstDayOfMonth(timestamp) {
			monthlyBackups = append(monthlyBackups, entry)
		} else if isFirstDayOfWeek(timestamp) {
			weeklyBackups = append(weeklyBackups, entry)
		} else {
			dailyBackups = append(dailyBackups, entry)
		}
	}

	sort.Slice(monthlyBackups, func(i, j int) bool {
		return monthlyBackups[i].Timestamp.After(monthlyBackups[j].Timestamp)
	})
	for i := 0; i < len(monthlyBackups) && i < config.Monthly; i++ {
		keep[monthlyBackups[i].Key] = true
	}

	sort.Slice(weeklyBackups, func(i, j int) bool {
		return weeklyBackups[i].Timestamp.After(weeklyBackups[j].Timestamp)
	})
	for i := 0; i < len(weeklyBackups) && i < config.Weekly; i++ {
		keep[weeklyBackups[i].Key] = true
	}

	sort.Slice(dailyBackups, func(i, j int) bool {
		return dailyBackups[i].Timestamp.After(dailyBackups[j].Timestamp)
	})
	for i := 0; i < len(dailyBackups) && i < config.Daily; i++ {
		keep[dailyBackups[i].Key] = true
	}

	return keep
}

func cleanupOldBackups(bucket string) error {
	client, err := getS3Client()
	if err != nil {
		return err
	}

	backups, err := listBackups(client, bucket)
	if err != nil {
		return fmt.Errorf("failed to list backups: %v", err)
	}

	if len(backups) == 0 {
		return nil
	}

	config := getRetentionConfig()
	keep := determineBackupsToKeep(backups, config)

	for _, obj := range backups {
		if !keep[*obj.Key] {
			_, err := client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
				Bucket: aws.String(bucket),
				Key:    obj.Key,
			})
			if err != nil {
				log.Printf("Failed to delete old backup %s: %v", *obj.Key, err)
				continue
			}
			log.Printf("Deleted old backup: s3://%s/%s", bucket, *obj.Key)
		}
	}

	return nil
}

func compressFile(src string, dst string) error {
	inputFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer inputFile.Close()

	outputFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	gzipWriter := gzip.NewWriter(outputFile)
	defer gzipWriter.Close()

	_, err = io.Copy(gzipWriter, inputFile)
	return err
}

// PerformBackup creates a hot backup of SQLite, compresses it, and uploads it to an S3-compatible object store
func PerformBackup() error {
	bucket := os.Getenv("S3_BUCKET_NAME")
	if bucket == "" {
		return fmt.Errorf("S3_BUCKET_NAME is not set, skipping backup")
	}

	timestamp := time.Now().Unix()
	backupFile := fmt.Sprintf("backup_%d.sqlite", timestamp)
	tempPath := "/tmp/" + backupFile
	compressedPath := tempPath + ".gz"

	err := database.DB.Exec("VACUUM INTO ?", tempPath).Error
	if err != nil {
		return fmt.Errorf("failed to snapshot database: %v", err)
	}
	defer os.Remove(tempPath)

	log.Println("Compressing backup...")
	if err := compressFile(tempPath, compressedPath); err != nil {
		return fmt.Errorf("failed to compress backup: %v", err)
	}
	defer os.Remove(compressedPath)

	client, err := getS3Client()
	if err != nil {
		return fmt.Errorf("failed to get S3 client: %v", err)
	}

	f, err := os.Open(compressedPath)
	if err != nil {
		return err
	}
	defer f.Close()

	objectKey := fmt.Sprintf("backups/%s.gz", backupFile)
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(objectKey),
		Body:   f,
	})

	if err != nil {
		return fmt.Errorf("failed to upload to S3: %v", err)
	}

	log.Printf("Backup successful: s3://%s/%s", bucket, objectKey)

	if err := cleanupOldBackups(bucket); err != nil {
		log.Printf("Warning: failed to cleanup old backups: %v", err)
	}

	return nil
}
