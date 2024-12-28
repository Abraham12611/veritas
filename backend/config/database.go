package config

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var DB *pgxpool.Pool

// InitDB initializes the database connection pool
func InitDB() {
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Error loading .env file: %v\n", err)
	}

	// Get database URL from environment variable
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	// Create a connection pool
	poolConfig, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatal(fmt.Errorf("error parsing database URL: %w", err))
	}

	// Set pool configuration
	poolConfig.MaxConns = 10
	poolConfig.MinConns = 2

	// Create the connection pool
	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		log.Fatal(fmt.Errorf("error connecting to the database: %w", err))
	}

	// Test the connection
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatal(fmt.Errorf("error connecting to the database: %w", err))
	}

	DB = pool
	log.Println("Successfully connected to database")
} 