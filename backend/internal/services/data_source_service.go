package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/Abraham12611/veritas/config"
	"github.com/Abraham12611/veritas/internal/models"
	"github.com/Abraham12611/veritas/internal/services/sync"
)

// DataSourceService handles business logic for data sources
type DataSourceService struct {
	ingestionService *IngestionService
}

// NewDataSourceService creates a new data source service
func NewDataSourceService() *DataSourceService {
	return &DataSourceService{
		ingestionService: NewIngestionService(),
	}
}

// ListDataSources returns all data sources for an instance
func (s *DataSourceService) ListDataSources(ctx context.Context, instanceID uuid.UUID) ([]models.DataSource, error) {
	query := `
		SELECT id, instance_id, name, type, config, status, last_sync, created_at, updated_at
		FROM data_sources
		WHERE instance_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`

	rows, err := config.DB.Query(ctx, query, instanceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dataSources []models.DataSource
	for rows.Next() {
		var ds models.DataSource
		err := rows.Scan(
			&ds.ID,
			&ds.InstanceID,
			&ds.Name,
			&ds.Type,
			&ds.Config,
			&ds.Status,
			&ds.LastSync,
			&ds.CreatedAt,
			&ds.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		dataSources = append(dataSources, ds)
	}

	return dataSources, nil
}

// GetDataSource returns a specific data source by ID
func (s *DataSourceService) GetDataSource(ctx context.Context, id uuid.UUID) (*models.DataSource, error) {
	query := `
		SELECT id, instance_id, name, type, config, status, last_sync, created_at, updated_at
		FROM data_sources
		WHERE id = $1 AND deleted_at IS NULL
	`

	var ds models.DataSource
	err := config.DB.QueryRow(ctx, query, id).Scan(
		&ds.ID,
		&ds.InstanceID,
		&ds.Name,
		&ds.Type,
		&ds.Config,
		&ds.Status,
		&ds.LastSync,
		&ds.CreatedAt,
		&ds.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &ds, nil
}

// CreateDataSource creates a new data source
func (s *DataSourceService) CreateDataSource(ctx context.Context, input models.CreateDataSourceInput) (*models.DataSource, error) {
	query := `
		INSERT INTO data_sources (id, instance_id, name, type, config, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		RETURNING id, instance_id, name, type, config, status, last_sync, created_at, updated_at
	`

	id := uuid.New()
	now := time.Now()

	var ds models.DataSource
	err := config.DB.QueryRow(ctx, query,
		id,
		input.InstanceID,
		input.Name,
		input.Type,
		input.Config,
		now,
	).Scan(
		&ds.ID,
		&ds.InstanceID,
		&ds.Name,
		&ds.Type,
		&ds.Config,
		&ds.Status,
		&ds.LastSync,
		&ds.CreatedAt,
		&ds.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &ds, nil
}

// UpdateDataSource updates an existing data source
func (s *DataSourceService) UpdateDataSource(ctx context.Context, id uuid.UUID, input models.UpdateDataSourceInput) (*models.DataSource, error) {
	query := `
		UPDATE data_sources
		SET name = COALESCE($1, name),
			config = COALESCE($2, config),
			status = COALESCE($3, status),
			updated_at = $4
		WHERE id = $5 AND deleted_at IS NULL
		RETURNING id, instance_id, name, type, config, status, last_sync, created_at, updated_at
	`

	var ds models.DataSource
	err := config.DB.QueryRow(ctx, query,
		input.Name,
		input.Config,
		input.Status,
		time.Now(),
		id,
	).Scan(
		&ds.ID,
		&ds.InstanceID,
		&ds.Name,
		&ds.Type,
		&ds.Config,
		&ds.Status,
		&ds.LastSync,
		&ds.CreatedAt,
		&ds.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &ds, nil
}

// DeleteDataSource soft deletes a data source
func (s *DataSourceService) DeleteDataSource(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE data_sources
		SET deleted_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`

	result, err := config.DB.Exec(ctx, query, time.Now(), id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("data source not found or already deleted")
	}

	return nil
}

// UpdateSyncStatus updates the sync status and last_sync timestamp
func (s *DataSourceService) UpdateSyncStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `
		UPDATE data_sources
		SET status = $1, last_sync = CASE WHEN $1 = 'active' THEN CURRENT_TIMESTAMP ELSE last_sync END
		WHERE id = $2 AND deleted_at IS NULL
	`

	result, err := config.DB.Exec(ctx, query, status, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("data source not found")
	}

	return nil
}

// TriggerSync initiates a sync operation for a data source
func (s *DataSourceService) TriggerSync(ctx context.Context, id uuid.UUID) error {
	// Get data source details
	ds, err := s.GetDataSource(ctx, id)
	if err != nil {
		return err
	}

	// Update status to syncing
	if err := s.UpdateSyncStatus(ctx, id, "syncing"); err != nil {
		return err
	}

	// Perform sync based on data source type
	var syncErr error
	switch ds.Type {
	case "github":
		syncErr = s.syncGitHub(ctx, ds)
	case "confluence":
		syncErr = s.syncConfluence(ctx, ds)
	case "notion":
		syncErr = s.syncNotion(ctx, ds)
	case "slack":
		syncErr = s.syncSlack(ctx, ds)
	default:
		syncErr = fmt.Errorf("unsupported data source type: %s", ds.Type)
	}

	// Update final status based on sync result
	if syncErr != nil {
		s.UpdateSyncStatus(ctx, id, "error")
		return fmt.Errorf("sync failed: %w", syncErr)
	}

	return s.UpdateSyncStatus(ctx, id, "active")
}

// syncGitHub syncs content from a GitHub repository
func (s *DataSourceService) syncGitHub(ctx context.Context, ds *models.DataSource) error {
	// Get GitHub access token from config
	accessToken := ds.Config.AccessToken
	if accessToken == "" {
		return errors.New("GitHub access token not found in config")
	}

	// Create GitHub service
	githubService := sync.NewGitHubService(accessToken)

	// Sync repository
	return githubService.SyncRepository(ctx, ds)
}

// syncConfluence syncs content from a Confluence space
func (s *DataSourceService) syncConfluence(ctx context.Context, ds *models.DataSource) error {
	// Get Confluence credentials from config
	baseURL := ds.Config.BaseURL
	if baseURL == "" {
		return errors.New("Confluence base URL not found in config")
	}

	username := ds.Config.Username
	if username == "" {
		return errors.New("Confluence username not found in config")
	}

	apiToken := ds.Config.APIToken
	if apiToken == "" {
		return errors.New("Confluence API token not found in config")
	}

	// Create Confluence service
	confluenceService := sync.NewConfluenceService(baseURL, username, apiToken)

	// Sync space
	return confluenceService.SyncSpace(ctx, ds)
}

func (s *DataSourceService) syncNotion(ctx context.Context, ds *models.DataSource) error {
	return errors.New("Notion sync not implemented")
}

func (s *DataSourceService) syncSlack(ctx context.Context, ds *models.DataSource) error {
	return errors.New("Slack sync not implemented")
} 