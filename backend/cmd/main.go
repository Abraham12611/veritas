package main

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/yourusername/veritas/config"
	"github.com/yourusername/veritas/internal/handlers"
	"github.com/yourusername/veritas/internal/logger"
	"github.com/yourusername/veritas/internal/middleware"
)

func main() {
	// Initialize logging
	logger.Initialize()
	logger.Info("Starting Veritas API server...")

	// Initialize database connection
	if err := config.InitDB(); err != nil {
		logger.Fatal("Failed to initialize database", err)
	}
	defer config.DB.Close()
	logger.Info("Database connection established")

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
			IdleTimeout:  5 * time.Second,
	})

	// Add middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: os.Getenv("CORS_ORIGINS"),
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE",
	}))

	// Health check endpoint (public)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
		})
	})

	// Setup routes
	setupRoutes(app)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	logger.Info("Server starting", logger.Fields{
		"port": port,
		"env":  os.Getenv("APP_ENV"),
	})
	if err := app.Listen(":" + port); err != nil {
		logger.Fatal("Server failed to start", err)
	}
}

func setupRoutes(app *fiber.App) {
	// Initialize handlers
	instanceHandler := handlers.NewInstanceHandler()
	dataSourceHandler := handlers.NewDataSourceHandler()

	// API routes
	api := app.Group("/api/v1")

	// Public routes
	api.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Welcome to Veritas API v1",
		})
	})

	// Protected routes
	protected := api.Use(middleware.AuthMiddleware())

	// Instance routes (protected)
	instances := protected.Group("/instances")
	instances.Get("/", instanceHandler.ListInstances)
	instances.Post("/", instanceHandler.CreateInstance)
	instances.Get("/:id", instanceHandler.GetInstance)
	instances.Put("/:id", instanceHandler.UpdateInstance)
	instances.Delete("/:id", instanceHandler.DeleteInstance)

	// Data source routes (protected)
	dataSources := protected.Group("/data-sources")
	dataSources.Get("/", dataSourceHandler.ListDataSources)
	dataSources.Post("/", dataSourceHandler.CreateDataSource)
	dataSources.Get("/:id", dataSourceHandler.GetDataSource)
	dataSources.Put("/:id", dataSourceHandler.UpdateDataSource)
	dataSources.Delete("/:id", dataSourceHandler.DeleteDataSource)
	dataSources.Post("/:id/sync", dataSourceHandler.SyncDataSource)

	// Query routes (protected)
	queries := protected.Group("/queries")
	queries.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "List queries endpoint"})
	})

	// Analytics routes (protected)
	analytics := protected.Group("/analytics")
	analytics.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Analytics dashboard endpoint"})
	})

	logger.Info("Routes configured successfully")
} 