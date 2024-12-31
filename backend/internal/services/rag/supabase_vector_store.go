package rag

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/Abraham12611/veritas/internal/models"
)

// SupabaseVectorStore implements the VectorStore interface using Supabase's pgvector
type SupabaseVectorStore struct {
	db *models.DB
}

// NewSupabaseVectorStore creates a new Supabase vector store
func NewSupabaseVectorStore(db *models.DB) *SupabaseVectorStore {
	return &SupabaseVectorStore{
		db: db,
	}
}

// SearchSimilar finds similar document chunks using vector similarity search
func (s *SupabaseVectorStore) SearchSimilar(ctx context.Context, instanceID uuid.UUID, embedding []float32, limit int) ([]models.DocumentChunk, error) {
	// Convert embedding to PostgreSQL vector format
	vectorStr := formatVector(embedding)

	// Query similar documents using cosine similarity
	query := `
		WITH document_scores AS (
			SELECT 
				d.id,
				d.title,
				d.content,
				d.url,
				d.metadata,
				1 - (d.embedding <=> $1::vector) as similarity_score
			FROM documents d
			WHERE d.instance_id = $2
				AND d.deleted_at IS NULL
			ORDER BY similarity_score DESC
			LIMIT $3
		)
		SELECT 
			id,
			title,
			content,
			url,
			metadata,
			similarity_score
		FROM document_scores
		WHERE similarity_score > 0.7 -- Minimum similarity threshold
	`

	rows, err := s.db.Query(ctx, query, vectorStr, instanceID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query similar documents: %w", err)
	}
	defer rows.Close()

	var chunks []models.DocumentChunk
	for rows.Next() {
		var chunk models.DocumentChunk
		var metadata []byte

		err := rows.Scan(
			&chunk.ID,
			&chunk.Title,
			&chunk.Content,
			&chunk.URL,
			&metadata,
			&chunk.Score,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Parse metadata JSON
		if len(metadata) > 0 {
			if err := json.Unmarshal(metadata, &chunk.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		chunks = append(chunks, chunk)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return chunks, nil
}

// formatVector converts a float32 slice to a PostgreSQL vector string
func formatVector(v []float32) string {
	var b strings.Builder
	b.WriteString("[")
	for i, f := range v {
		if i > 0 {
			b.WriteString(",")
		}
		b.WriteString(fmt.Sprintf("%f", f))
	}
	b.WriteString("]")
	return b.String()
} 