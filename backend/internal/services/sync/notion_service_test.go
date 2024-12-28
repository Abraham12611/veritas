package sync

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/veritas/internal/models"
)

func TestNotionService_SyncDatabase(t *testing.T) {
	// Create a mock HTTP server
	var requestCount int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Track request count
		atomic.AddInt32(&requestCount, 1)

		// Check authentication
		token := r.Header.Get("Authorization")
		if token != "Bearer test-token" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		// Simulate rate limiting
		if atomic.LoadInt32(&requestCount) > 10 {
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"message": "Rate limit exceeded"}`))
			return
		}

		// Handle different endpoints
		switch {
		case strings.HasSuffix(r.URL.Path, "/databases/test-db"):
			// Database metadata
			w.Write([]byte(`{
				"id": "test-db",
				"title": [
					{
						"text": {
							"content": "Test Database"
						}
					}
				],
				"properties": {
					"Name": {
						"type": "title",
						"title": {}
					}
				}
			}`))

		case strings.HasSuffix(r.URL.Path, "/databases/test-db/query"):
			// Database query results
			w.Write([]byte(`{
				"results": [
					{
						"id": "page1",
						"created_time": "2024-01-01T00:00:00Z",
						"last_edited_time": "2024-01-01T00:00:00Z",
						"title": "Test Page 1",
						"properties": {
							"Name": {
								"title": [
									{
										"text": {
											"content": "Test Page 1"
										}
									}
								]
							}
						}
					}
				],
				"next_cursor": null,
				"has_more": false
			}`))

		case strings.Contains(r.URL.Path, "/blocks/"):
			// Page content
			w.Write([]byte(`{
				"results": [
					{
						"type": "paragraph",
						"paragraph": {
							"rich_text": [
								{
									"type": "text",
									"text": {
										"content": "Test content"
									}
								}
							]
						}
					}
				]
			}`))

		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewNotionService("test-token")
	service.baseURL = server.URL
	service.concurrency = 2 // Use 2 workers for testing

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "notion",
		Config: models.DataSourceConfig{
			DatabaseID: "test-db",
			APIToken:   "test-token",
		},
	}

	// Test sync
	err := service.SyncDatabase(context.Background(), ds)
	if err != nil {
		t.Errorf("SyncDatabase() error = %v", err)
	}

	// Verify request count is reasonable
	count := atomic.LoadInt32(&requestCount)
	if count < 3 { // Database metadata, query, and page content
		t.Errorf("Expected at least 3 requests, got %d", count)
	}
}

func TestNotionService_RateLimiting(t *testing.T) {
	// Create a mock HTTP server that always returns rate limit error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"message": "Rate limit exceeded"}`))
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewNotionService("test-token")
	service.baseURL = server.URL
	service.maxRetries = 2 // Reduce retries for faster test

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "notion",
		Config: models.DataSourceConfig{
			DatabaseID: "test-db",
			APIToken:   "test-token",
		},
	}

	// Test sync with rate limiting
	err := service.SyncDatabase(context.Background(), ds)
	if err == nil {
		t.Error("Expected rate limit error, got nil")
	}
	if !strings.Contains(err.Error(), "Rate limit") {
		t.Errorf("Expected rate limit error, got: %v", err)
	}
}

func TestNotionService_Cancellation(t *testing.T) {
	// Create a mock HTTP server that delays responses
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.Write([]byte(`{"results": []}`))
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewNotionService("test-token")
	service.baseURL = server.URL

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "notion",
		Config: models.DataSourceConfig{
			DatabaseID: "test-db",
			APIToken:   "test-token",
		},
	}

	// Create cancellable context
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	// Test sync with cancellation
	err := service.SyncDatabase(ctx, ds)
	if err == nil {
		t.Error("Expected context deadline exceeded error, got nil")
	}
	if !strings.Contains(err.Error(), "context deadline exceeded") {
		t.Errorf("Expected context deadline exceeded error, got: %v", err)
	}
}

func TestNotionService_DatabasePagination(t *testing.T) {
	var pageCount int32
	var requestCount int32

	// Create a mock HTTP server that returns paginated results
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)

		if strings.HasSuffix(r.URL.Path, "/databases/test-db") {
			// Database metadata
			w.Write([]byte(`{
				"id": "test-db",
				"title": [{"text": {"content": "Test Database"}}],
				"properties": {"Name": {"type": "title", "title": {}}}
			}`))
			return
		}

		if strings.HasSuffix(r.URL.Path, "/databases/test-db/query") {
			currentPage := atomic.AddInt32(&pageCount, 1)
			hasMore := currentPage < 3

			// Return different pages of results
			w.Write([]byte(`{
				"results": [
					{
						"id": "page` + string(currentPage) + `",
						"created_time": "2024-01-01T00:00:00Z",
						"last_edited_time": "2024-01-01T00:00:00Z",
						"title": "Test Page ` + string(currentPage) + `",
						"properties": {
							"Name": {
								"title": [{"text": {"content": "Test Page"}}]
							}
						}
					}
				],
				"next_cursor": ` + (map[bool]string{true: `"next-page"`, false: "null"})[hasMore] + `,
				"has_more": ` + (map[bool]string{true: "true", false: "false"})[hasMore] + `
			}`))
			return
		}

		if strings.Contains(r.URL.Path, "/blocks/") {
			w.Write([]byte(`{
				"results": [
					{
						"type": "paragraph",
						"paragraph": {
							"rich_text": [{"type": "text", "text": {"content": "Test content"}}]
						}
					}
				]
			}`))
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewNotionService("test-token")
	service.baseURL = server.URL
	service.concurrency = 2

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "notion",
		Config: models.DataSourceConfig{
			DatabaseID: "test-db",
			APIToken:   "test-token",
		},
	}

	// Test sync
	err := service.SyncDatabase(context.Background(), ds)
	if err != nil {
		t.Errorf("SyncDatabase() error = %v", err)
	}

	// Verify pagination
	if pageCount != 3 {
		t.Errorf("Expected 3 pages of results, got %d", pageCount)
	}

	// Verify total request count (metadata + pages + content)
	count := atomic.LoadInt32(&requestCount)
	expectedRequests := 1 + // Database metadata
		int32(pageCount) + // Page queries
		pageCount // Content requests
	if count != expectedRequests {
		t.Errorf("Expected %d requests, got %d", expectedRequests, count)
	}
} 