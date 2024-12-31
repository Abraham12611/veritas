package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/Abraham12611/veritas/internal/models"
	"github.com/Abraham12611/veritas/internal/services"
)

// DataSourceHandler handles data source-related requests
type DataSourceHandler struct {
	service *services.DataSourceService
}

// NewDataSourceHandler creates a new data source handler
func NewDataSourceHandler() *DataSourceHandler {
	return &DataSourceHandler{
		service: services.NewDataSourceService(),
	}
}

// ListDataSources returns all data sources for an instance
func (h *DataSourceHandler) ListDataSources(c *fiber.Ctx) error {
	instanceID := c.Query("instance_id")
	if instanceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Instance ID is required",
		})
	}

	parsedInstanceID, err := uuid.Parse(instanceID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid instance ID format",
		})
	}

	dataSources, err := h.service.ListDataSources(c.Context(), parsedInstanceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve data sources",
		})
	}

	return c.JSON(dataSources)
}

// GetDataSource returns a specific data source
func (h *DataSourceHandler) GetDataSource(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Data source ID is required",
		})
	}

	dataSourceID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid data source ID format",
		})
	}

	dataSource, err := h.service.GetDataSource(c.Context(), dataSourceID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Data source not found",
		})
	}

	return c.JSON(dataSource)
}

// CreateDataSource creates a new data source
func (h *DataSourceHandler) CreateDataSource(c *fiber.Ctx) error {
	var input models.CreateDataSourceInput

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	dataSource, err := h.service.CreateDataSource(c.Context(), input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create data source",
		})
	}

	// Trigger initial sync in background
	go h.service.TriggerSync(c.Context(), dataSource.ID)

	return c.Status(fiber.StatusCreated).JSON(dataSource)
}

// UpdateDataSource updates an existing data source
func (h *DataSourceHandler) UpdateDataSource(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Data source ID is required",
		})
	}

	dataSourceID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid data source ID format",
		})
	}

	var input models.UpdateDataSourceInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	dataSource, err := h.service.UpdateDataSource(c.Context(), dataSourceID, input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update data source",
		})
	}

	return c.JSON(dataSource)
}

// DeleteDataSource deletes a data source
func (h *DataSourceHandler) DeleteDataSource(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Data source ID is required",
		})
	}

	dataSourceID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid data source ID format",
		})
	}

	if err := h.service.DeleteDataSource(c.Context(), dataSourceID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete data source",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// SyncDataSource triggers a sync for a data source
func (h *DataSourceHandler) SyncDataSource(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Data source ID is required",
		})
	}

	dataSourceID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid data source ID format",
		})
	}

	// Start sync in background
	go h.service.TriggerSync(c.Context(), dataSourceID)

	return c.JSON(fiber.Map{
		"message": "Sync started",
		"id":      dataSourceID,
	})
} 