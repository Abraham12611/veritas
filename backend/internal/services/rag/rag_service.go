package rag

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/Abraham12611/veritas/internal/models"
)

// Package rag implements Retrieval-Augmented Generation (RAG) functionality for the Veritas platform.
// It provides services for question answering using vector search and language models,
// combining document retrieval with AI-powered text generation.
//
// The main components are:
// - RAGService: Orchestrates the QA process using vector search and LLM
// - LLMClient: Interface for language model operations (implemented by OpenAIClient)
// - VectorStore: Interface for vector similarity search (implemented by SupabaseVectorStore)

// LLMClient defines the interface for language model operations.
// Implementations should handle token limits, rate limiting, and error handling.
type LLMClient interface {
	// CreateEmbedding generates a vector embedding for the given text.
	// The embedding can be used for similarity search or other vector operations.
	CreateEmbedding(ctx context.Context, text string) ([]float32, error)

	// Complete generates text based on the given completion request.
	// It should handle prompt construction and response parsing.
	Complete(ctx context.Context, req CompletionRequest) (string, error)
}

// VectorStore defines the interface for vector search operations.
// Implementations should handle efficient similarity search over document embeddings.
type VectorStore interface {
	// SearchSimilar finds document chunks similar to the given embedding.
	// It returns up to 'limit' chunks, ordered by similarity score.
	SearchSimilar(ctx context.Context, instanceID uuid.UUID, embedding []float32, limit int) ([]models.DocumentChunk, error)
}

// DB defines the interface for database operations related to queries and answers.
// Implementations should handle CRUD operations for the QA process.
type DB interface {
	// CreateQuery stores a new query in the database.
	CreateQuery(ctx context.Context, query *models.Query) error

	// CreateAnswer stores a new answer in the database.
	CreateAnswer(ctx context.Context, answer *models.Answer) error
}

// CompletionRequest represents a request to generate text using a language model.
// It includes both system and user prompts to guide the model's response.
type CompletionRequest struct {
	// SystemPrompt provides context and instructions for the model
	SystemPrompt string

	// UserPrompt contains the actual content to complete
	UserPrompt string

	// Temperature controls response randomness (0.0-1.0)
	Temperature float32

	// MaxTokens limits the response length
	MaxTokens int
}

// RAGService handles question answering using vector search and LLM integration.
// It coordinates between the vector store for retrieval and the LLM for generation.
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

// AnswerQuestion processes a question and returns an answer with relevant sources.
// It performs the following steps:
// 1. Validates and stores the question
// 2. Generates an embedding for the question
// 3. Searches for relevant document chunks
// 4. Builds a prompt with the found context
// 5. Generates an answer using the LLM
// 6. Stores and returns the answer with sources
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