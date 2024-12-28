package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/yourusername/veritas/internal/logger"
	"github.com/yourusername/veritas/internal/models"
	"golang.org/x/sync/errgroup"
	"golang.org/x/time/rate"
)

// NotionService handles syncing content from Notion
type NotionService struct {
	client      *http.Client
	limiter     *rate.Limiter
	maxRetries  int
	apiKey      string
	concurrency int
	baseURL     string
}

// NewNotionService creates a new Notion sync service
func NewNotionService(apiKey string) *NotionService {
	// Create HTTP client with reasonable timeouts
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create rate limiter: 3 requests per second (Notion API limit)
	limiter := rate.NewLimiter(rate.Every(time.Second/3), 1)

	return &NotionService{
		client:      client,
		limiter:     limiter,
		maxRetries:  3,
		apiKey:      apiKey,
		concurrency: 5, // Process 5 pages concurrently
		baseURL:     "https://api.notion.com/v1",
	}
}

// withRetry executes a function with retries and rate limiting
func (s *NotionService) withRetry(ctx context.Context, operation func() error) error {
	var lastErr error
	for attempt := 0; attempt <= s.maxRetries; attempt++ {
		// Wait for rate limiter
		if err := s.limiter.Wait(ctx); err != nil {
			return fmt.Errorf("rate limiter error: %w", err)
		}

		// Execute operation
		if err := operation(); err != nil {
			lastErr = err
			// Check if error is retryable
			if isRetryableError(err) {
				// Exponential backoff
				backoff := time.Duration(attempt*attempt) * time.Second
				select {
				case <-time.After(backoff):
					continue
				case <-ctx.Done():
					return ctx.Err()
				}
			}
			return err // Non-retryable error
		}
		return nil // Success
	}
	return fmt.Errorf("max retries exceeded: %w", lastErr)
}

// SyncDatabase syncs content from a Notion database
func (s *NotionService) SyncDatabase(ctx context.Context, ds *models.DataSource) error {
	logger.Info("Starting Notion database sync", logger.Fields{
		"dataSourceId": ds.ID,
		"databaseId":  ds.Config.DatabaseID,
	})

	// Get database metadata
	database, err := s.getDatabase(ctx, ds.Config.DatabaseID)
	if err != nil {
		return fmt.Errorf("failed to get database: %w", err)
	}

	// Create error group for concurrent processing
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(s.concurrency)

	// Channel for pages to process
	pagesChan := make(chan NotionPage, s.concurrency*2)

	// Start page processor workers
	var processWg sync.WaitGroup
	processWg.Add(s.concurrency)
	for i := 0; i < s.concurrency; i++ {
		g.Go(func() error {
			defer processWg.Done()
			for page := range pagesChan {
				select {
				case <-ctx.Done():
					return ctx.Err()
				default:
					if err := s.processPage(ctx, ds, page); err != nil {
						logger.Error("Failed to process page", err, logger.Fields{
							"pageId":    page.ID,
							"pageTitle": page.Title,
						})
						continue
					}
				}
			}
			return nil
		})
	}

	// Start page fetcher
	g.Go(func() error {
		defer close(pagesChan)

		var cursor string
		for {
			pages, nextCursor, err := s.queryDatabase(ctx, ds.Config.DatabaseID, cursor)
			if err != nil {
				return fmt.Errorf("failed to query database: %w", err)
			}

			// Send pages to processor
			for _, page := range pages {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case pagesChan <- page:
				}
			}

			// Check if we've processed all pages
			if nextCursor == "" {
				break
			}
			cursor = nextCursor
		}

		return nil
	})

	// Wait for all goroutines to complete
	if err := g.Wait(); err != nil {
		return fmt.Errorf("error during sync: %w", err)
	}

	logger.Info("Completed Notion database sync", logger.Fields{
		"dataSourceId": ds.ID,
		"databaseId":  ds.Config.DatabaseID,
	})

	return nil
}

// getDatabase retrieves database metadata
func (s *NotionService) getDatabase(ctx context.Context, databaseID string) (*NotionDatabase, error) {
	endpoint := fmt.Sprintf("%s/databases/%s", s.baseURL, databaseID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Notion-Version", "2022-06-28")
	req.Header.Set("Content-Type", "application/json")

	var database NotionDatabase
	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get database: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&database)
	})

	if err != nil {
		return nil, err
	}

	return &database, nil
}

// queryDatabase queries pages from a database
func (s *NotionService) queryDatabase(ctx context.Context, databaseID string, startCursor string) ([]NotionPage, string, error) {
	endpoint := fmt.Sprintf("%s/databases/%s/query", s.baseURL, databaseID)

	body := map[string]interface{}{
		"page_size": 100,
	}
	if startCursor != "" {
		body["start_cursor"] = startCursor
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, "", err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Notion-Version", "2022-06-28")
	req.Header.Set("Content-Type", "application/json")

	var response struct {
		Results    []NotionPage `json:"results"`
		NextCursor string       `json:"next_cursor"`
		HasMore    bool         `json:"has_more"`
	}

	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to query database: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&response)
	})

	if err != nil {
		return nil, "", err
	}

	return response.Results, response.NextCursor, nil
}

// processPage processes a single Notion page
func (s *NotionService) processPage(ctx context.Context, ds *models.DataSource, page NotionPage) error {
	logger.Debug("Processing Notion page", logger.Fields{
		"pageId":    page.ID,
		"pageTitle": page.Title,
	})

	// Get page content
	content, err := s.getPageContent(ctx, page.ID)
	if err != nil {
		return fmt.Errorf("failed to get page content: %w", err)
	}

	// Create document input
	input := models.CreateDocumentInput{
		InstanceID:   ds.InstanceID,
		DataSourceID: ds.ID,
		Title:        page.Title,
		Content:      content,
		URL:          fmt.Sprintf("https://notion.so/%s", page.ID),
		Type:         "notion",
		Metadata: models.Metadata{
			SourcePath: fmt.Sprintf("/databases/%s/pages/%s", ds.Config.DatabaseID, page.ID),
			ExternalID: page.ID,
			Extra: map[string]interface{}{
				"lastEdited": page.LastEditedTime,
				"createdAt": page.CreatedTime,
				"properties": page.Properties,
			},
		},
	}

	// TODO: Call ingestion service to process the document
	logger.Info("Would process document", logger.Fields{
		"title": input.Title,
		"url":   input.URL,
	})

	return nil
}

// getPageContent retrieves and formats the content of a Notion page
func (s *NotionService) getPageContent(ctx context.Context, pageID string) (string, error) {
	endpoint := fmt.Sprintf("%s/blocks/%s/children", s.baseURL, pageID)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Notion-Version", "2022-06-28")

	var response struct {
		Results []NotionBlock `json:"results"`
	}

	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get page content: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&response)
	})

	if err != nil {
		return "", err
	}

	// Convert blocks to text
	var content strings.Builder
	for _, block := range response.Results {
		content.WriteString(block.PlainText)
		content.WriteString("\n\n")
	}

	return content.String(), nil
}

// NotionDatabase represents a Notion database
type NotionDatabase struct {
	ID    string `json:"id"`
	Title []struct {
		Text struct {
			Content string `json:"content"`
		} `json:"text"`
	} `json:"title"`
	Properties map[string]interface{} `json:"properties"`
}

// NotionPage represents a Notion page
type NotionPage struct {
	ID             string                 `json:"id"`
	CreatedTime    string                 `json:"created_time"`
	LastEditedTime string                 `json:"last_edited_time"`
	Title          string                 `json:"title"`
	Properties     map[string]interface{} `json:"properties"`
}

// NotionBlock represents a block of content in a Notion page
type NotionBlock struct {
	Type      string `json:"type"`
	PlainText string `json:"plain_text,omitempty"`
	Content   struct {
		Text string `json:"text,omitempty"`
	} `json:"content,omitempty"`
} 