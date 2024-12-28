package models

import (
	"time"

	"github.com/google/uuid"
)

// Instance represents a Veritas instance
type Instance struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	APIKey      string    `json:"api_key,omitempty"`
	UserID      uuid.UUID `json:"user_id"`
	Settings    Settings  `json:"settings"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Settings represents instance-specific settings
type Settings struct {
	LLMProvider    string                 `json:"llm_provider"`     // e.g., "openai", "anthropic"
	LLMModel       string                 `json:"llm_model"`        // e.g., "gpt-4", "claude-2"
	MaxTokens      int                    `json:"max_tokens"`
	Temperature    float64                `json:"temperature"`
	TopP          float64                `json:"top_p"`
	VectorStore   string                 `json:"vector_store"`     // e.g., "pgvector", "pinecone"
	CustomPrompt   string                 `json:"custom_prompt"`
	ExtraSettings  map[string]interface{} `json:"extra_settings"`
}

// CreateInstanceInput represents the input for creating a new instance
type CreateInstanceInput struct {
	Name        string   `json:"name" validate:"required"`
	Description string   `json:"description"`
	Settings    Settings `json:"settings" validate:"required"`
} 