# RAG Service Documentation

## Overview
The RAG (Retrieval-Augmented Generation) service provides question-answering capabilities by combining vector search with language model generation. It retrieves relevant documents based on the question and uses them as context for generating accurate answers.

## Components

### RAGService
The main service that orchestrates the QA process.

```go
type RAGService struct {
    db          DB
    llm         LLMClient
    vectorStore VectorStore
}
```

#### Methods

##### AnswerQuestion
```go
func (s *RAGService) AnswerQuestion(ctx context.Context, instanceID uuid.UUID, question string) (*models.Answer, error)
```

Processes a user's question and returns an answer with relevant sources. The process involves:
1. Validating and storing the question
2. Generating an embedding for the question
3. Finding relevant document chunks using vector similarity search
4. Building a prompt with the found context
5. Generating an answer using the language model
6. Storing and returning the answer with sources

**Parameters:**
- `ctx`: Context for cancellation and timeouts
- `instanceID`: UUID of the instance making the query
- `question`: The user's question text

**Returns:**
- `*models.Answer`: The generated answer with sources
- `error`: Any error that occurred during processing

### LLMClient
Interface for language model operations.

```go
type LLMClient interface {
    CreateEmbedding(ctx context.Context, text string) ([]float32, error)
    Complete(ctx context.Context, req CompletionRequest) (string, error)
}
```

#### OpenAIClient
Implementation of LLMClient using OpenAI's API.

**Features:**
- Automatic retries with exponential backoff
- Configurable timeouts
- Error handling for rate limits and API issues
- Support for different models (GPT-4, GPT-3.5-turbo)

### VectorStore
Interface for vector similarity search operations.

```go
type VectorStore interface {
    SearchSimilar(ctx context.Context, instanceID uuid.UUID, embedding []float32, limit int) ([]models.DocumentChunk, error)
}
```

#### SupabaseVectorStore
Implementation using Supabase's pgvector extension.

**Features:**
- Efficient similarity search using IVFFLAT index
- Configurable similarity threshold
- Instance-based document isolation
- Support for metadata filtering

## Usage Example

```go
// Initialize dependencies
db := NewDB()
llm := NewOpenAIClient(apiKey, "gpt-4-turbo-preview")
vectorStore := NewSupabaseVectorStore(db)

// Create RAG service
ragService := NewRAGService(db, llm, vectorStore)

// Process a question
answer, err := ragService.AnswerQuestion(ctx, instanceID, "What is Veritas?")
if err != nil {
    log.Printf("Error processing question: %v", err)
    return
}

// Use the answer
fmt.Printf("Answer: %s\n", answer.Content)
fmt.Printf("Sources:\n")
for _, source := range answer.Sources {
    fmt.Printf("- %s (%s)\n", source.Title, source.URL)
}
```

## Error Handling
The service handles various error cases:
- Empty or invalid questions
- Database errors
- LLM API errors
- Vector search errors
- Context cancellation/timeout

## Performance Considerations
- Uses connection pooling for database operations
- Implements retries for transient failures
- Supports concurrent question processing
- Configurable context timeouts
- Efficient vector search with indexing

## Testing
Comprehensive test suite includes:
- Unit tests for core functionality
- Integration tests with mock dependencies
- Concurrency tests
- Error case coverage
- Context cancellation/timeout tests

## Dependencies
- `github.com/google/uuid`: For unique identifiers
- `github.com/jackc/pgx/v5`: PostgreSQL driver
- `github.com/cenkalti/backoff/v4`: For retry logic
- OpenAI API client libraries

## Configuration
The service can be configured through environment variables:
- `OPENAI_API_KEY`: API key for OpenAI
- `OPENAI_MODEL`: Model to use (default: "gpt-4-turbo-preview")
- `VECTOR_SIMILARITY_THRESHOLD`: Minimum similarity score (default: 0.7)
- `MAX_CONTEXT_CHUNKS`: Maximum chunks to include in context (default: 5) 