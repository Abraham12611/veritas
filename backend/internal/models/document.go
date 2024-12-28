package models

import (
	"time"

	"github.com/google/uuid"
)

// Document represents an ingested document
type Document struct {
	ID           uuid.UUID  `json:"id"`
	InstanceID   uuid.UUID  `json:"instance_id"`
	DataSourceID uuid.UUID  `json:"data_source_id"`
	Title        string     `json:"title"`
	Content      string     `json:"content"`
	URL          string     `json:"url"`
	Type         string     `json:"type"`           // markdown, text, html, pdf
	Metadata     Metadata   `json:"metadata"`
	Chunks       []Chunk    `json:"chunks"`
	Embedding    []float64  `json:"embedding"`      // document-level embedding
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at"`
}

// Metadata represents document-specific metadata
type Metadata struct {
	Author      string                 `json:"author,omitempty"`
	LastUpdated time.Time             `json:"last_updated,omitempty"`
	Tags        []string              `json:"tags,omitempty"`
	Category    string                `json:"category,omitempty"`
	ExternalID  string                `json:"external_id,omitempty"`  // ID from source system
	SourcePath  string                `json:"source_path,omitempty"`  // Path in source system
	Extra       map[string]interface{} `json:"extra,omitempty"`
}

// Chunk represents a section of a document
type Chunk struct {
	ID        uuid.UUID `json:"id"`
	Content   string    `json:"content"`
	Embedding []float64 `json:"embedding"`
	StartChar int       `json:"start_char"`
	EndChar   int       `json:"end_char"`
	Metadata  Metadata  `json:"metadata"`
}

// CreateDocumentInput represents the input for creating a new document
type CreateDocumentInput struct {
	InstanceID   uuid.UUID `json:"instance_id" validate:"required"`
	DataSourceID uuid.UUID `json:"data_source_id" validate:"required"`
	Title        string    `json:"title" validate:"required"`
	Content      string    `json:"content" validate:"required"`
	URL          string    `json:"url"`
	Type         string    `json:"type" validate:"required,oneof=markdown text html pdf"`
	Metadata     Metadata  `json:"metadata"`
}

// UpdateDocumentInput represents the input for updating a document
type UpdateDocumentInput struct {
	Title    *string   `json:"title"`
	Content  *string   `json:"content"`
	URL      *string   `json:"url"`
	Metadata *Metadata `json:"metadata"`
} 