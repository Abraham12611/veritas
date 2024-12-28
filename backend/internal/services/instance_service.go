package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/veritas/config"
	"github.com/yourusername/veritas/internal/models"
)

// InstanceService handles business logic for instances
type InstanceService struct{}

// NewInstanceService creates a new instance service
func NewInstanceService() *InstanceService {
	return &InstanceService{}
}

// ListInstances returns all instances for a user
func (s *InstanceService) ListInstances(ctx context.Context, userID uuid.UUID) ([]models.Instance, error) {
	query := `
		SELECT id, name, description, user_id, settings, created_at, updated_at
		FROM instances
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`

	rows, err := config.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var instances []models.Instance
	for rows.Next() {
		var instance models.Instance
		err := rows.Scan(
			&instance.ID,
			&instance.Name,
			&instance.Description,
			&instance.UserID,
			&instance.Settings,
			&instance.CreatedAt,
			&instance.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		instances = append(instances, instance)
	}

	return instances, nil
}

// GetInstance returns a specific instance by ID
func (s *InstanceService) GetInstance(ctx context.Context, id uuid.UUID) (*models.Instance, error) {
	query := `
		SELECT id, name, description, user_id, settings, created_at, updated_at
		FROM instances
		WHERE id = $1 AND deleted_at IS NULL
	`

	var instance models.Instance
	err := config.DB.QueryRow(ctx, query, id).Scan(
		&instance.ID,
		&instance.Name,
		&instance.Description,
		&instance.UserID,
		&instance.Settings,
		&instance.CreatedAt,
		&instance.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &instance, nil
}

// CreateInstance creates a new instance
func (s *InstanceService) CreateInstance(ctx context.Context, input models.CreateInstanceInput, userID uuid.UUID) (*models.Instance, error) {
	query := `
		INSERT INTO instances (id, name, description, user_id, settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		RETURNING id, name, description, user_id, settings, created_at, updated_at
	`

	id := uuid.New()
	now := time.Now()

	var instance models.Instance
	err := config.DB.QueryRow(ctx, query,
		id,
		input.Name,
		input.Description,
		userID,
		input.Settings,
		now,
	).Scan(
		&instance.ID,
		&instance.Name,
		&instance.Description,
		&instance.UserID,
		&instance.Settings,
		&instance.CreatedAt,
		&instance.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &instance, nil
}

// UpdateInstance updates an existing instance
func (s *InstanceService) UpdateInstance(ctx context.Context, id uuid.UUID, input models.CreateInstanceInput) (*models.Instance, error) {
	query := `
		UPDATE instances
		SET name = $1, description = $2, settings = $3, updated_at = $4
		WHERE id = $5 AND deleted_at IS NULL
		RETURNING id, name, description, user_id, settings, created_at, updated_at
	`

	var instance models.Instance
	err := config.DB.QueryRow(ctx, query,
		input.Name,
		input.Description,
		input.Settings,
		time.Now(),
		id,
	).Scan(
		&instance.ID,
		&instance.Name,
		&instance.Description,
		&instance.UserID,
		&instance.Settings,
		&instance.CreatedAt,
		&instance.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &instance, nil
}

// DeleteInstance soft deletes an instance
func (s *InstanceService) DeleteInstance(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE instances
		SET deleted_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`

	result, err := config.DB.Exec(ctx, query, time.Now(), id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("instance not found or already deleted")
	}

	return nil
} 