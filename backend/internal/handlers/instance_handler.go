package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/Abraham12611/veritas/internal/models"
	"github.com/Abraham12611/veritas/internal/services"
)

// InstanceHandler handles instance-related requests
type InstanceHandler struct {
	service *services.InstanceService
}

// NewInstanceHandler creates a new instance handler
func NewInstanceHandler() *InstanceHandler {
	return &InstanceHandler{
		service: services.NewInstanceService(),
	}
}

// ListInstances returns all instances for a user
func (h *InstanceHandler) ListInstances(c *fiber.Ctx) error {
	// TODO: Get user ID from authenticated context
	userID := uuid.New() // Temporary for testing

	instances, err := h.service.ListInstances(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve instances",
		})
	}

	return c.JSON(instances)
}

// GetInstance returns a specific instance
func (h *InstanceHandler) GetInstance(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Instance ID is required",
		})
	}

	instanceID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid instance ID format",
		})
	}

	instance, err := h.service.GetInstance(c.Context(), instanceID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Instance not found",
		})
	}

	return c.JSON(instance)
}

// CreateInstance creates a new instance
func (h *InstanceHandler) CreateInstance(c *fiber.Ctx) error {
	var input models.CreateInstanceInput

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// TODO: Get user ID from authenticated context
	userID := uuid.New() // Temporary for testing

	instance, err := h.service.CreateInstance(c.Context(), input, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create instance",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(instance)
}

// UpdateInstance updates an existing instance
func (h *InstanceHandler) UpdateInstance(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Instance ID is required",
		})
	}

	instanceID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid instance ID format",
		})
	}

	var input models.CreateInstanceInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	instance, err := h.service.UpdateInstance(c.Context(), instanceID, input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update instance",
		})
	}

	return c.JSON(instance)
}

// DeleteInstance deletes an instance
func (h *InstanceHandler) DeleteInstance(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Instance ID is required",
		})
	}

	instanceID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid instance ID format",
		})
	}

	if err := h.service.DeleteInstance(c.Context(), instanceID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete instance",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
} 