package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/Abraham12611/veritas/config"
	"github.com/Abraham12611/veritas/internal/models"
)

// IngestionService handles document ingestion and processing
type IngestionService struct{}

// NewIngestionService creates a new ingestion service
func NewIngestionService() *IngestionService {
	return &IngestionService{}
}

// IngestDocument processes and stores a document
func (s *IngestionService) IngestDocument(ctx context.Context, input models.CreateDocumentInput) (*models.Document, error) {
	// Create the document record
	doc, err := s.createDocument(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to create document: %w", err)
	}

	// Process the document content into chunks
	chunks, err := s.processContent(ctx, doc.ID, input.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to process content: %w", err)
	}

	// Store the chunks
	if err := s.storeChunks(ctx, doc.ID, chunks); err != nil {
		return nil, fmt.Errorf("failed to store chunks: %w", err)
	}

	return doc, nil
}

// createDocument creates a new document record
func (s *IngestionService) createDocument(ctx context.Context, input models.CreateDocumentInput) (*models.Document, error) {
	query := `
		INSERT INTO documents (
			id, instance_id, data_source_id, title, content, url, type, metadata,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
		RETURNING id, instance_id, data_source_id, title, content, url, type, metadata,
				  created_at, updated_at
	`

	id := uuid.New()
	now := time.Now()

	var doc models.Document
	err := config.DB.QueryRow(ctx, query,
		id,
		input.InstanceID,
		input.DataSourceID,
		input.Title,
		input.Content,
		input.URL,
		input.Type,
		input.Metadata,
		now,
	).Scan(
		&doc.ID,
		&doc.InstanceID,
		&doc.DataSourceID,
		&doc.Title,
		&doc.Content,
		&doc.URL,
		&doc.Type,
		&doc.Metadata,
		&doc.CreatedAt,
		&doc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &doc, nil
}

// processContent splits content into chunks and generates embeddings
func (s *IngestionService) processContent(ctx context.Context, docID uuid.UUID, content string) ([]models.Chunk, error) {
	// Split content into chunks
	chunks := s.splitIntoChunks(content)

	// Process each chunk
	var processedChunks []models.Chunk
	for _, chunk := range chunks {
		// TODO: Generate embedding for chunk using OpenAI or other provider
		// For now, we'll use a placeholder
		embedding := []float64{0.0} // Placeholder

		processedChunk := models.Chunk{
			ID:        uuid.New(),
			Content:   chunk.content,
			StartChar: chunk.start,
			EndChar:   chunk.end,
			Embedding: embedding,
			Metadata: models.Metadata{
				Extra: map[string]interface{}{
					"position": len(processedChunks),
				},
			},
		}
		processedChunks = append(processedChunks, processedChunk)
	}

	return processedChunks, nil
}

// storeChunks stores processed chunks in the database
func (s *IngestionService) storeChunks(ctx context.Context, docID uuid.UUID, chunks []models.Chunk) error {
	// Begin transaction
	tx, err := config.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Prepare the insert statement
	stmt, err := tx.Prepare(ctx, "insert_chunks", `
		INSERT INTO chunks (id, document_id, content, embedding, start_char, end_char, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`)
	if err != nil {
		return err
	}

	// Insert each chunk
	now := time.Now()
	for _, chunk := range chunks {
		_, err := tx.Exec(ctx, stmt.Name,
			chunk.ID,
			docID,
			chunk.Content,
			chunk.Embedding,
			chunk.StartChar,
			chunk.EndChar,
			chunk.Metadata,
			now,
		)
		if err != nil {
			return err
		}
	}

	// Commit transaction
	return tx.Commit(ctx)
}

// chunkInfo represents a content chunk with position information
type chunkInfo struct {
	content string
	start   int
	end     int
}

// splitIntoChunks splits content into overlapping chunks
func (s *IngestionService) splitIntoChunks(content string) []chunkInfo {
	const (
		maxChunkSize    = 1000 // Maximum characters per chunk
		overlapSize     = 100  // Number of characters to overlap between chunks
		minChunkSize    = 100  // Minimum characters per chunk
	)

	var chunks []chunkInfo
	contentLength := len(content)
	
	if contentLength <= maxChunkSize {
		// Content is small enough to be a single chunk
		chunks = append(chunks, chunkInfo{
			content: content,
			start:   0,
			end:     contentLength,
		})
		return chunks
	}

	// Split content into chunks with overlap
	start := 0
	for start < contentLength {
		// Calculate end position for this chunk
		end := start + maxChunkSize
		if end > contentLength {
			end = contentLength
		}

		// Find a good break point (end of sentence or paragraph)
		if end < contentLength {
			// Look for paragraph break
			if idx := strings.LastIndex(content[start:end], "\n\n"); idx != -1 && (end-start-idx) > minChunkSize {
				end = start + idx
			} else if idx := strings.LastIndex(content[start:end], ". "); idx != -1 && (end-start-idx) > minChunkSize {
				// Look for sentence break
				end = start + idx + 1 // Include the period
			}
		}

		// Create the chunk
		chunks = append(chunks, chunkInfo{
			content: content[start:end],
			start:   start,
			end:     end,
		})

		// Move start position for next chunk, accounting for overlap
		start = end - overlapSize
		if start < 0 {
			start = 0
		}
	}

	return chunks
}

// DeleteDocument soft deletes a document and its chunks
func (s *IngestionService) DeleteDocument(ctx context.Context, id uuid.UUID) error {
	// Begin transaction
	tx, err := config.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Soft delete the document
	result, err := tx.Exec(ctx, `
		UPDATE documents
		SET deleted_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`, time.Now(), id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("document not found or already deleted")
	}

	// Hard delete associated chunks (they don't need soft delete)
	_, err = tx.Exec(ctx, `
		DELETE FROM chunks
		WHERE document_id = $1
	`, id)
	if err != nil {
		return err
	}

	// Commit transaction
	return tx.Commit(ctx)
} 