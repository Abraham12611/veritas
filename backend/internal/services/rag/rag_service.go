package rag

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/veritas/internal/models"
)

// LLMClient defines the interface for language model operations
type LLMClient interface {
	CreateEmbedding(ctx context.Context, text string) ([]float32, error)
	Complete(ctx context.Context, req CompletionRequest) (string, error)
}

// VectorStore defines the interface for vector search operations
type VectorStore interface {
	SearchSimilar(ctx context.Context, instanceID uuid.UUID, embedding []float32, limit int) ([]models.DocumentChunk, error)
}

// DB defines the interface for database operations
type DB interface {
	CreateQuery(ctx context.Context, query *models.Query) error
	CreateAnswer(ctx context.Context, answer *models.Answer) error
}

// CompletionRequest represents a request to generate text
type CompletionRequest struct {
	SystemPrompt string
	UserPrompt   string
	Temperature  float32
	MaxTokens    int
}

// RAGService handles question answering using vector search and LLM
type RAGService struct {
	db          DB
	llm         LLMClient
	vectorStore VectorStore
}

// NewRAGService creates a new RAG service
func NewRAGService(db DB, llm LLMClient, vectorStore VectorStore) *RAGService {
	return &RAGService{
		db:          db,
		llm:         llm,
		vectorStore: vectorStore,
	}
}

// AnswerQuestion processes a question and returns an answer with sources
func (s *RAGService) AnswerQuestion(ctx context.Context, instanceID uuid.UUID, question string) (*models.Answer, error) {
	// Validate input
	if question = strings.TrimSpace(question); question == "" {
		return nil, fmt.Errorf("question cannot be empty")
	}

	// Create query record
	query := &models.Query{
		ID:         uuid.New(),
		InstanceID: instanceID,
		Question:   question,
		CreatedAt:  time.Now(),
	}

	if err := s.db.CreateQuery(ctx, query); err != nil {
		return nil, fmt.Errorf("failed to create query: %w", err)
	}

	// Generate embedding for the question
	embedding, err := s.llm.CreateEmbedding(ctx, question)
	if err != nil {
		return nil, fmt.Errorf("failed to create embedding: %w", err)
	}

	// Search for relevant documents
	chunks, err := s.vectorStore.SearchSimilar(ctx, instanceID, embedding, 5)
	if err != nil {
		return nil, fmt.Errorf("failed to search similar documents: %w", err)
	}

	// Create answer
	var answer *models.Answer
	if len(chunks) == 0 {
		// No relevant documents found
		answer = s.createNoContextAnswer(query.ID)
	} else {
		// Build prompt with context
		prompt := s.buildPrompt(question, chunks)

		// Generate answer using LLM
		completion, err := s.llm.Complete(ctx, CompletionRequest{
			SystemPrompt: s.getSystemPrompt(),
			UserPrompt:   prompt,
			Temperature: 0.7,
			MaxTokens:   1000,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to generate answer: %w", err)
		}

		answer = &models.Answer{
			ID:        uuid.New(),
			QueryID:   query.ID,
			Content:   completion,
			Sources:   s.formatSources(chunks),
			CreatedAt: time.Now(),
		}
	}

	// Save answer
	if err := s.db.CreateAnswer(ctx, answer); err != nil {
		return nil, fmt.Errorf("failed to create answer: %w", err)
	}

	return answer, nil
}

// getSystemPrompt returns the system prompt for the LLM
func (s *RAGService) getSystemPrompt() string {
	return `You are a helpful AI assistant that answers questions based on the provided context.
Your answers should be:
1. Accurate and based only on the provided context
2. Clear and well-structured
3. Professional but conversational in tone
4. Include relevant quotes or references when appropriate

If the context doesn't contain enough information to answer the question fully,
acknowledge this and explain what information is missing.`
}

// buildPrompt creates a prompt with context for the LLM
func (s *RAGService) buildPrompt(question string, chunks []models.DocumentChunk) string {
	var sb strings.Builder

	sb.WriteString("Context:\n")
	for i, chunk := range chunks {
		sb.WriteString(fmt.Sprintf("\n[Document %d: %s]\n%s\n", i+1, chunk.Title, chunk.Content))
	}

	sb.WriteString("\nQuestion: ")
	sb.WriteString(question)
	sb.WriteString("\n\nAnswer: ")

	return sb.String()
}

// formatSources formats document chunks as sources
func (s *RAGService) formatSources(chunks []models.DocumentChunk) []models.Source {
	sources := make([]models.Source, len(chunks))
	for i, chunk := range chunks {
		sources[i] = models.Source{
			Title: chunk.Title,
			URL:   chunk.URL,
			Score: chunk.Score,
		}
	}
	return sources
}

// createNoContextAnswer creates an answer when no relevant context is found
func (s *RAGService) createNoContextAnswer(queryID uuid.UUID) *models.Answer {
	return &models.Answer{
		ID:        uuid.New(),
		QueryID:   queryID,
		Content:   "No relevant information found in the knowledge base.",
		Sources:   []models.Source{},
		CreatedAt: time.Now(),
	}
} 