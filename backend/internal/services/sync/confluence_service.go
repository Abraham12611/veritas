package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/yourusername/veritas/internal/logger"
	"github.com/yourusername/veritas/internal/models"
	"golang.org/x/sync/errgroup"
	"golang.org/x/time/rate"
)

// ConfluenceService handles syncing content from Confluence
type ConfluenceService struct {
	client      *http.Client
	limiter     *rate.Limiter
	maxRetries  int
	baseURL     string
	username    string
	apiToken    string
	concurrency int
}

// NewConfluenceService creates a new Confluence sync service
func NewConfluenceService(baseURL, username, apiToken string) *ConfluenceService {
	// Create HTTP client with reasonable timeouts
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create rate limiter: 200 requests per minute (Confluence Cloud API limit)
	limiter := rate.NewLimiter(rate.Every(time.Minute/200), 1)

	return &ConfluenceService{
		client:      client,
		limiter:     limiter,
		maxRetries:  3,
		baseURL:     strings.TrimSuffix(baseURL, "/"),
		username:    username,
		apiToken:    apiToken,
		concurrency: 5, // Process 5 pages concurrently
	}
}

// withRetry executes a function with retries and rate limiting
func (s *ConfluenceService) withRetry(ctx context.Context, operation func() error) error {
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

// isRetryableError determines if an error should trigger a retry
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// Check for rate limit errors (HTTP 429)
	if strings.Contains(err.Error(), "429") {
		return true
	}

	// Check for network-related errors
	if strings.Contains(err.Error(), "connection refused") ||
		strings.Contains(err.Error(), "timeout") ||
		strings.Contains(err.Error(), "temporary failure") {
		return true
	}

	// Check for server errors (HTTP 5xx)
	if strings.Contains(err.Error(), "500") ||
		strings.Contains(err.Error(), "502") ||
		strings.Contains(err.Error(), "503") ||
		strings.Contains(err.Error(), "504") {
		return true
	}

	return false
}

// SyncSpace syncs content from a Confluence space
func (s *ConfluenceService) SyncSpace(ctx context.Context, ds *models.DataSource) error {
	logger.Info("Starting Confluence space sync", logger.Fields{
		"dataSourceId": ds.ID,
		"spaceKey":    ds.Config.SpaceKey,
	})

	// Get space details first
	space, err := s.getSpace(ctx, ds.Config.SpaceKey)
	if err != nil {
		return fmt.Errorf("failed to get space details: %w", err)
	}

	// Create error group for concurrent processing
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(s.concurrency) // Limit concurrent goroutines

	// Channel for pages to process
	pagesChan := make(chan ConfluencePage, s.concurrency*2)

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
						// Continue processing other pages
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
		start := 0
		limit := 25

		for {
			var pages []ConfluencePage
			err := s.withRetry(ctx, func() error {
				p, err := s.getPages(ctx, ds.Config.SpaceKey, start, limit)
				if err != nil {
					return err
				}
				pages = p
				return nil
			})

			if err != nil {
				return fmt.Errorf("failed to get pages: %w", err)
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
			if len(pages) < limit {
				break
			}

			// Move to next batch
			start += limit
		}

		return nil
	})

	// Wait for all goroutines to complete
	if err := g.Wait(); err != nil {
		return fmt.Errorf("error during sync: %w", err)
	}

	logger.Info("Completed Confluence space sync", logger.Fields{
		"dataSourceId": ds.ID,
		"spaceKey":    ds.Config.SpaceKey,
	})

	return nil
}

// getSpace retrieves space details
func (s *ConfluenceService) getSpace(ctx context.Context, spaceKey string) (*ConfluenceSpace, error) {
	endpoint := fmt.Sprintf("%s/wiki/rest/api/space/%s", s.baseURL, url.PathEscape(spaceKey))
	
	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(s.username, s.apiToken)
	req.Header.Set("Accept", "application/json")

	var space ConfluenceSpace
	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get space: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&space)
	})

	if err != nil {
		return nil, err
	}

	return &space, nil
}

// getPages retrieves a batch of pages from a space
func (s *ConfluenceService) getPages(ctx context.Context, spaceKey string, start, limit int) ([]ConfluencePage, error) {
	endpoint := fmt.Sprintf("%s/wiki/rest/api/space/%s/content/page?start=%d&limit=%d&expand=body.storage",
		s.baseURL, url.PathEscape(spaceKey), start, limit)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(s.username, s.apiToken)
	req.Header.Set("Accept", "application/json")

	var response struct {
		Results []ConfluencePage `json:"results"`
	}

	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get pages: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&response)
	})

	if err != nil {
		return nil, err
	}

	return response.Results, nil
}

// processPage processes a single Confluence page
func (s *ConfluenceService) processPage(ctx context.Context, ds *models.DataSource, page ConfluencePage) error {
	logger.Debug("Processing Confluence page", logger.Fields{
		"pageId":    page.ID,
		"pageTitle": page.Title,
	})

	// Convert HTML content to plain text
	plainText, err := HTMLToText(page.Body.Storage.Value)
	if err != nil {
		return fmt.Errorf("failed to convert HTML to text: %w", err)
	}

	// Create document input
	input := models.CreateDocumentInput{
		InstanceID:   ds.InstanceID,
		DataSourceID: ds.ID,
		Title:        page.Title,
		Content:      plainText,
		URL:          fmt.Sprintf("%s/wiki/spaces/%s/pages/%s", s.baseURL, ds.Config.SpaceKey, page.ID),
		Type:         "confluence",
		Metadata: models.Metadata{
			SourcePath: fmt.Sprintf("/spaces/%s/pages/%s", ds.Config.SpaceKey, page.ID),
				ExternalID: page.ID,
				Extra: map[string]interface{}{
					"version":     page.Version.Number,
					"lastUpdated": page.Version.When,
					"creator":     page.Version.By.DisplayName,
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

// ConfluenceSpace represents a Confluence space
type ConfluenceSpace struct {
	ID    string `json:"id"`
	Key   string `json:"key"`
	Name  string `json:"name"`
	Type  string `json:"type"`
	Links struct {
		WebUI string `json:"webui"`
	} `json:"_links"`
}

// ConfluencePage represents a Confluence page
type ConfluencePage struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Status  string `json:"status"`
	Title   string `json:"title"`
	Version struct {
		Number int    `json:"number"`
		When   string `json:"when"`
		By     struct {
			DisplayName string `json:"displayName"`
		} `json:"by"`
	} `json:"version"`
	Body struct {
		Storage struct {
			Value string `json:"value"`
		} `json:"storage"`
	} `json:"body"`
} 