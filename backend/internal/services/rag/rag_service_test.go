package rag

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/veritas/internal/models"
)

// MockLLMClient implements LLMClient for testing
type MockLLMClient struct {
	embeddings map[string][]float32
	responses  map[string]string
}

func NewMockLLMClient() *MockLLMClient {
	return &MockLLMClient{
		embeddings: make(map[string][]float32),
		responses:  make(map[string]string),
	}
}

func (m *MockLLMClient) CreateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if embedding, ok := m.embeddings[text]; ok {
		return embedding, nil
	}
	return []float32{0.1, 0.2, 0.3}, nil // Default mock embedding
}

func (m *MockLLMClient) Complete(ctx context.Context, req CompletionRequest) (string, error) {
	if response, ok := m.responses[req.UserPrompt]; ok {
		return response, nil
	}
	return "Mock response based on the provided context.", nil
}

// MockVectorStore implements VectorStore for testing
type MockVectorStore struct {
	chunks []models.DocumentChunk
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
	return m.chunks, nil
}

// MockDB implements minimal DB interface for testing
type MockDB struct {
	queries  []*models.Query
	answers  []*models.Answer
}

func NewMockDB() *MockDB {
	return &MockDB{
		queries:  make([]*models.Query, 0),
		answers:  make([]*models.Answer, 0),
	}
}

func (m *MockDB) CreateQuery(ctx context.Context, query *models.Query) error {
	m.queries = append(m.queries, query)
	return nil
}

func (m *MockDB) CreateAnswer(ctx context.Context, answer *models.Answer) error {
	m.answers = append(m.answers, answer)
	return nil
}

func TestRAGService_AnswerQuestion(t *testing.T) {
	// Create dependencies
	mockDB := NewMockDB()
	mockLLM := NewMockLLMClient()
	mockVector := NewMockVectorStore()

	// Create RAG service
	service := NewRAGService(mockDB, mockLLM, mockVector)

	// Test cases
	tests := []struct {
		name       string
		instanceID uuid.UUID
		question   string
		wantErr    bool
	}{
		{
			name:       "Basic question",
			instanceID: uuid.New(),
			question:   "What is in document 1?",
			wantErr:    false,
		},
		{
			name:       "Empty question",
			instanceID: uuid.New(),
			question:   "",
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Process question
			answer, err := service.AnswerQuestion(context.Background(), tt.instanceID, tt.question)

			// Check error
			if (err != nil) != tt.wantErr {
				t.Errorf("AnswerQuestion() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Verify answer
				if answer == nil {
					t.Error("Expected non-nil answer")
					return
				}

				// Check that query was created
				if len(mockDB.queries) == 0 {
					t.Error("Expected query to be created")
					return
				}

				// Check that answer was created
				if len(mockDB.answers) == 0 {
					t.Error("Expected answer to be created")
					return
				}

				// Verify answer has sources
				if len(answer.Sources) == 0 {
					t.Error("Expected answer to have sources")
					return
				}
			}
		})
	}
}

func TestRAGService_NoContext(t *testing.T) {
	// Create dependencies
	mockDB := NewMockDB()
	mockLLM := NewMockLLMClient()
	mockVector := &MockVectorStore{chunks: []models.DocumentChunk{}} // Empty chunks

	// Create RAG service
	service := NewRAGService(mockDB, mockLLM, mockVector)

	// Test question with no relevant context
	answer, err := service.AnswerQuestion(context.Background(), uuid.New(), "Test question")
	if err != nil {
		t.Errorf("AnswerQuestion() error = %v", err)
		return
	}

	// Verify no-context response
	if answer == nil {
		t.Error("Expected non-nil answer")
		return
	}

	if len(answer.Sources) != 0 {
		t.Error("Expected no sources for no-context answer")
		return
	}

	if answer.Content != "No relevant information found in the knowledge base." {
		t.Errorf("Expected no-context message, got: %s", answer.Content)
	}
}

func TestRAGService_BuildPrompt(t *testing.T) {
	// Create service
	service := NewRAGService(nil, nil, nil)

	// Test chunks
	chunks := []models.DocumentChunk{
		{
			Title:   "Doc 1",
			Content: "Content 1",
			Score:   0.9,
		},
		{
			Title:   "Doc 2",
			Content: "Content 2",
			Score:   0.8,
		},
	}

	// Build prompt
	prompt := service.buildPrompt("Test question", chunks)

	// Verify prompt structure
	if !strings.Contains(prompt, "Context:") {
		t.Error("Expected prompt to contain 'Context:'")
	}

	if !strings.Contains(prompt, "Doc 1") || !strings.Contains(prompt, "Content 1") {
		t.Error("Expected prompt to contain first document")
	}

	if !strings.Contains(prompt, "Doc 2") || !strings.Contains(prompt, "Content 2") {
		t.Error("Expected prompt to contain second document")
	}

	if !strings.Contains(prompt, "Question: Test question") {
		t.Error("Expected prompt to contain question")
	}
}

func TestRAGService_FormatSources(t *testing.T) {
	// Create service
	service := NewRAGService(nil, nil, nil)

	// Test chunks
	chunks := []models.DocumentChunk{
		{
			Title: "Doc 1",
			URL:   "https://example.com/1",
			Score: 0.9,
		},
		{
			Title: "Doc 2",
			URL:   "https://example.com/2",
			Score: 0.8,
		},
	}

	// Format sources
	sources := service.formatSources(chunks)

	// Verify sources
	if len(sources) != len(chunks) {
		t.Errorf("Expected %d sources, got %d", len(chunks), len(sources))
	}

	for i, source := range sources {
		if source.Title != chunks[i].Title {
			t.Errorf("Expected title %s, got %s", chunks[i].Title, source.Title)
		}
		if source.URL != chunks[i].URL {
			t.Errorf("Expected URL %s, got %s", chunks[i].URL, source.URL)
		}
		if source.Score != chunks[i].Score {
			t.Errorf("Expected score %f, got %f", chunks[i].Score, source.Score)
		}
	}
} 