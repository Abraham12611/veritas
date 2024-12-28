package models

import (
	"time"

	"github.com/google/uuid"
)

// DataSource represents a data source configuration
type DataSource struct {
	ID         uuid.UUID `json:"id"`
	InstanceID uuid.UUID `json:"instance_id"`
	Name       string    `json:"name"`
	Type       string    `json:"type"` // github, confluence, notion, slack, etc.
	Config     Config    `json:"config"`
	Status     string    `json:"status"` // active, inactive, syncing, error
	LastSync   time.Time `json:"last_sync"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Config represents source-specific configuration
type Config struct {
	// Common fields
	URL           string `json:"url,omitempty"`
	APIKey        string `json:"api_key,omitempty"`
	AccessToken   string `json:"access_token,omitempty"`
	RefreshToken  string `json:"refresh_token,omitempty"`
	ClientID      string `json:"client_id,omitempty"`
	ClientSecret  string `json:"client_secret,omitempty"`
	Workspace     string `json:"workspace,omitempty"`
	Organization  string `json:"organization,omitempty"`
	Repository    string `json:"repository,omitempty"`
	
	// Source-specific settings
	SyncFrequency string                 `json:"sync_frequency"` // hourly, daily, weekly
	Filters       map[string]interface{} `json:"filters"`        // source-specific filters
	ExtraSettings map[string]interface{} `json:"extra_settings"` // additional configuration
}

// CreateDataSourceInput represents the input for creating a new data source
type CreateDataSourceInput struct {
	InstanceID uuid.UUID `json:"instance_id" validate:"required"`
	Name       string    `json:"name" validate:"required"`
	Type       string    `json:"type" validate:"required,oneof=github confluence notion slack zendesk"`
	Config     Config    `json:"config" validate:"required"`
}

// UpdateDataSourceInput represents the input for updating a data source
type UpdateDataSourceInput struct {
	Name   *string `json:"name"`
	Config *Config `json:"config"`
	Status *string `json:"status" validate:"omitempty,oneof=active inactive"`
} 