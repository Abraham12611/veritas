package models

import (
	"time"

	"github.com/google/uuid"
)

// Query represents a user's question
type Query struct {
	ID         uuid.UUID `json:"id"`
	InstanceID uuid.UUID `json:"instance_id"`
	UserID     uuid.UUID `json:"user_id"`
	Question   string    `json:"question"`
	Context    Context   `json:"context"`
	CreatedAt  time.Time `json:"created_at"`
}

// Context represents additional context for the query
type Context struct {
	Source     string                 `json:"source"`      // web, slack, discord, api
	Channel    string                 `json:"channel"`     // specific channel or thread
	UserInfo   map[string]string      `json:"user_info"`  // user metadata
	ThreadID   string                 `json:"thread_id"`   // conversation thread ID
	Extra      map[string]interface{} `json:"extra"`      // additional context
}

// Answer represents an AI-generated response
type Answer struct {
	ID           uuid.UUID   `json:"id"`
	QueryID      uuid.UUID   `json:"query_id"`
	Content      string      `json:"content"`
	Citations    []Citation  `json:"citations"`
	Confidence   float64     `json:"confidence"`
	TokensUsed   int         `json:"tokens_used"`
	ProcessingMs int         `json:"processing_ms"`  // processing time in milliseconds
	Model        string      `json:"model"`          // LLM model used
	CreatedAt    time.Time   `json:"created_at"`
	Feedback     *Feedback   `json:"feedback"`
}

// Citation represents a source reference for an answer
type Citation struct {
	DocumentID   uuid.UUID `json:"document_id"`
	ChunkID      uuid.UUID `json:"chunk_id"`
	Content      string    `json:"content"`       // relevant excerpt
	URL          string    `json:"url"`           // source URL
	Title        string    `json:"title"`         // document title
	Relevance    float64   `json:"relevance"`     // similarity score
}

// Feedback represents user feedback on an answer
type Feedback struct {
	IsHelpful    bool      `json:"is_helpful"`
	Rating       int       `json:"rating"`        // 1-5 rating
	Comment      string    `json:"comment"`
	CreatedAt    time.Time `json:"created_at"`
}

// CreateQueryInput represents the input for creating a new query
type CreateQueryInput struct {
	InstanceID uuid.UUID `json:"instance_id" validate:"required"`
	UserID     uuid.UUID `json:"user_id" validate:"required"`
	Question   string    `json:"question" validate:"required"`
	Context    Context   `json:"context"`
}

// CreateAnswerInput represents the input for creating a new answer
type CreateAnswerInput struct {
	QueryID      uuid.UUID  `json:"query_id" validate:"required"`
	Content      string     `json:"content" validate:"required"`
	Citations    []Citation `json:"citations"`
	Confidence   float64    `json:"confidence"`
	TokensUsed   int        `json:"tokens_used"`
	ProcessingMs int        `json:"processing_ms"`
	Model        string     `json:"model"`
}

// CreateFeedbackInput represents the input for creating answer feedback
type CreateFeedbackInput struct {
	AnswerID   uuid.UUID `json:"answer_id" validate:"required"`
	IsHelpful  bool      `json:"is_helpful"`
	Rating     int       `json:"rating" validate:"min=1,max=5"`
	Comment    string    `json:"comment"`
} 