package rag

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/veritas/internal/models"
)

// MockLLMClient implements LLMClient for testing
type MockLLMClient struct {
	embeddings map[string][]float32
	responses  map[string]string
	shouldFail bool
}

func NewMockLLMClient() *MockLLMClient {
	return &MockLLMClient{
		embeddings: make(map[string][]float32),
		responses:  make(map[string]string),
	}
}

func (m *MockLLMClient) CreateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if m.shouldFail {
		return nil, errors.New("mock embedding error")
	}
	if embedding, ok := m.embeddings[text]; ok {
		return embedding, nil
	}
	return []float32{0.1, 0.2, 0.3}, nil
}

func (m *MockLLMClient) Complete(ctx context.Context, req CompletionRequest) (string, error) {
	if m.shouldFail {
		return "", errors.New("mock completion error")
	}
	if response, ok := m.responses[req.UserPrompt]; ok {
		return response, nil
	}
	return "Mock response based on the provided context.", nil
}

// MockVectorStore implements VectorStore for testing
type MockVectorStore struct {
	chunks     []models.DocumentChunk
	shouldFail bool
}

func NewMockVectorStore() *MockVectorStore {
	return &MockVectorStore{
		chunks: []models.DocumentChunk{
			{
				ID:      uuid.New(),
				Title:   "Test Document 1",
				Content: "This is test content for document 1.",
				URL:     "https://example.com/doc1",
				Score:   0.95,
			},
			{
				ID:      uuid.New(),
				Title:   "Test Document 2",
				Content: "This is test content for document 2.",
				URL:     "https://example.com/doc2",
				Score:   0.85,
			},
		},
	}
}

func (m *MockVectorStore) SearchSimilar(ctx context.Context, instanceID uuid.UUID, embedding []float32, limit int) ([]models.DocumentChunk, error) {
	if m.shouldFail {
		return nil, errors.New("mock search error")
	}
	return m.chunks, nil
}

// MockDB implements DB interface for testing
type MockDB struct {
	queries    []*models.Query
	answers    []*models.Answer
	shouldFail bool
}

func NewMockDB() *MockDB {
	return &MockDB{
		queries: make([]*models.Query, 0),
		answers: make([]*models.Answer, 0),
	}
}

func (m *MockDB) CreateQuery(ctx context.Context, query *models.Query) error {
	if m.shouldFail {
		return errors.New("mock db error")
	}
	m.queries = append(m.queries, query)
	return nil
}

func (m *MockDB) CreateAnswer(ctx context.Context, answer *models.Answer) error {
	if m.shouldFail {
		return errors.New("mock db error")
	}
	m.answers = append(m.answers, answer)
	return nil
}

func TestRAGService_AnswerQuestion(t *testing.T) {
	tests := []struct {
		name       string
		instanceID uuid.UUID
		question   string
		setupMocks func(*MockDB, *MockLLMClient, *MockVectorStore)
		wantErr    bool
		errMsg     string
	}{
		{
			name:       "Basic question",
			instanceID: uuid.New(),
			question:   "What is in document 1?",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {},
			wantErr:    false,
		},
		{
			name:       "Empty question",
			instanceID: uuid.New(),
			question:   "",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {},
			wantErr:    true,
			errMsg:     "question cannot be empty",
		},
		{
			name:       "DB error on query creation",
			instanceID: uuid.New(),
			question:   "Test question",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {
				db.shouldFail = true
			},
			wantErr: true,
			errMsg:  "failed to create query",
		},
		{
			name:       "Embedding creation error",
			instanceID: uuid.New(),
			question:   "Test question",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {
				llm.shouldFail = true
			},
			wantErr: true,
			errMsg:  "failed to create embedding",
		},
		{
			name:       "Vector search error",
			instanceID: uuid.New(),
			question:   "Test question",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {
				vs.shouldFail = true
			},
			wantErr: true,
			errMsg:  "failed to search similar documents",
		},
		{
			name:       "DB error on answer creation",
			instanceID: uuid.New(),
			question:   "Test question",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {
				db.shouldFail = true
			},
			wantErr: true,
			errMsg:  "failed to create",
		},
		{
			name:       "Long question handling",
			instanceID: uuid.New(),
			question:   string(make([]byte, 10000)), // 10KB question
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {},
			wantErr:    false,
		},
		{
			name:       "Special characters in question",
			instanceID: uuid.New(),
			question:   "What about <script>alert('test')</script>?",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {},
			wantErr:    false,
		},
		{
			name:       "Context window exceeded",
			instanceID: uuid.New(),
			question:   "Test question",
			setupMocks: func(db *MockDB, llm *MockLLMClient, vs *MockVectorStore) {
				vs.chunks = make([]models.DocumentChunk, 100) // Many chunks
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create dependencies
			mockDB := NewMockDB()
			mockLLM := NewMockLLMClient()
			mockVector := NewMockVectorStore()

			// Setup mocks
			tt.setupMocks(mockDB, mockLLM, mockVector)

			// Create service
			service := NewRAGService(mockDB, mockLLM, mockVector)

			// Process question
			answer, err := service.AnswerQuestion(context.Background(), tt.instanceID, tt.question)

			// Check error
			if (err != nil) != tt.wantErr {
				t.Errorf("AnswerQuestion() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.errMsg != "" && err != nil {
				if !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("Expected error containing %q, got %q", tt.errMsg, err.Error())
				}
				return
			}

			if !tt.wantErr {
				if answer == nil {
					t.Error("Expected non-nil answer")
					return
				}

				if len(mockDB.queries) == 0 {
					t.Error("Expected query to be created")
				}

				if len(mockDB.answers) == 0 {
					t.Error("Expected answer to be created")
				}
			}
		})
	}
}

func TestRAGService_Concurrency(t *testing.T) {
	// Create dependencies
	mockDB := NewMockDB()
	mockLLM := NewMockLLMClient()
	mockVector := NewMockVectorStore()

	// Create service
	service := NewRAGService(mockDB, mockLLM, mockVector)

	// Number of concurrent requests
	n := 10
	instanceID := uuid.New()

	// Create channels for results
	type result struct {
		answer *models.Answer
		err    error
	}
	results := make(chan result, n)

	// Make concurrent requests
	for i := 0; i < n; i++ {
		go func(i int) {
			answer, err := service.AnswerQuestion(
				context.Background(),
				instanceID,
				fmt.Sprintf("Question %d", i),
			)
			results <- result{answer, err}
		}(i)
	}

	// Collect results
	for i := 0; i < n; i++ {
		res := <-results
		if res.err != nil {
			t.Errorf("Concurrent request %d failed: %v", i, res.err)
		}
		if res.answer == nil {
			t.Errorf("Concurrent request %d returned nil answer", i)
		}
	}

	// Verify all queries and answers were created
	if len(mockDB.queries) != n {
		t.Errorf("Expected %d queries, got %d", n, len(mockDB.queries))
	}
	if len(mockDB.answers) != n {
		t.Errorf("Expected %d answers, got %d", n, len(mockDB.answers))
	}
}

func TestRAGService_ContextCancellation(t *testing.T) {
	// Create dependencies
	mockDB := NewMockDB()
	mockLLM := NewMockLLMClient()
	mockVector := NewMockVectorStore()

	// Create service
	service := NewRAGService(mockDB, mockLLM, mockVector)

	// Create cancelled context
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	// Try to process question
	_, err := service.AnswerQuestion(ctx, uuid.New(), "Test question")
	if err == nil {
		t.Error("Expected error due to cancelled context")
	}
}

func TestRAGService_Timeout(t *testing.T) {
	// Create dependencies
	mockDB := NewMockDB()
	mockLLM := NewMockLLMClient()
	mockVector := NewMockVectorStore()

	// Create service
	service := NewRAGService(mockDB, mockLLM, mockVector)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	// Sleep to ensure timeout
	time.Sleep(2 * time.Millisecond)

	// Try to process question
	_, err := service.AnswerQuestion(ctx, uuid.New(), "Test question")
	if err == nil {
		t.Error("Expected error due to context timeout")
	}
} 