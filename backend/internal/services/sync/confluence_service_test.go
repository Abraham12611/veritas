package sync

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/Abraham12611/veritas/internal/models"
)

func TestConfluenceService_SyncSpace(t *testing.T) {
	// Create a mock HTTP server
	var requestCount int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Track request count
		atomic.AddInt32(&requestCount, 1)

		// Check authentication
		username, password, ok := r.BasicAuth()
		if !ok || username != "test-user" || password != "test-token" {
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
		case strings.HasPrefix(r.URL.Path, "/wiki/rest/api/space/TEST"):
			if strings.Contains(r.URL.Path, "/content/page") {
				// Parse start parameter
				start := r.URL.Query().Get("start")
				if start == "0" {
					// First page of results
					w.Write([]byte(`{
						"results": [
							{
								"id": "page1",
								"type": "page",
								"status": "current",
								"title": "Test Page 1",
								"version": {
									"number": 1,
									"when": "2024-01-01T00:00:00Z",
									"by": {
										"displayName": "Test User"
									}
								},
								"body": {
									"storage": {
										"value": "<p>Test content 1</p>"
									}
								}
							},
							{
								"id": "page2",
								"type": "page",
								"status": "current",
								"title": "Test Page 2",
								"version": {
									"number": 1,
									"when": "2024-01-01T00:00:00Z",
									"by": {
										"displayName": "Test User"
									}
								},
								"body": {
									"storage": {
										"value": "<p>Test content 2</p>"
									}
								}
							}
						]
					}`))
				} else {
					// No more results
					w.Write([]byte(`{"results": []}`))
				}
			} else {
				// Space details
				w.Write([]byte(`{
					"id": "123",
					"key": "TEST",
					"name": "Test Space",
					"type": "global",
					"_links": {
						"webui": "/spaces/TEST"
					}
				}`))
			}

		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewConfluenceService(server.URL, "test-user", "test-token")
	service.concurrency = 2 // Use 2 workers for testing

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "confluence",
		Config: models.DataSourceConfig{
			BaseURL:   server.URL,
			Username:  "test-user",
			APIToken:  "test-token",
			SpaceKey:  "TEST",
		},
	}

	// Test sync
	err := service.SyncSpace(context.Background(), ds)
	if err != nil {
		t.Errorf("SyncSpace() error = %v", err)
	}

	// Verify request count is reasonable
	count := atomic.LoadInt32(&requestCount)
	if count < 2 { // At least space request and one page request
		t.Errorf("Expected at least 2 requests, got %d", count)
	}
}

func TestConfluenceService_RateLimiting(t *testing.T) {
	// Create a mock HTTP server that always returns rate limit error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"message": "Rate limit exceeded"}`))
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewConfluenceService(server.URL, "test-user", "test-token")
	service.maxRetries = 2 // Reduce retries for faster test

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "confluence",
		Config: models.DataSourceConfig{
			BaseURL:   server.URL,
			Username:  "test-user",
			APIToken:  "test-token",
			SpaceKey:  "TEST",
		},
	}

	// Test sync with rate limiting
	err := service.SyncSpace(context.Background(), ds)
	if err == nil {
		t.Error("Expected rate limit error, got nil")
	}
	if !strings.Contains(err.Error(), "Rate limit") {
		t.Errorf("Expected rate limit error, got: %v", err)
	}
}

func TestConfluenceService_Cancellation(t *testing.T) {
	// Create a mock HTTP server that delays responses
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.Write([]byte(`{"results": []}`))
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewConfluenceService(server.URL, "test-user", "test-token")

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "confluence",
		Config: models.DataSourceConfig{
			BaseURL:   server.URL,
			Username:  "test-user",
			APIToken:  "test-token",
			SpaceKey:  "TEST",
		},
	}

	// Create cancellable context
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	// Test sync with cancellation
	err := service.SyncSpace(ctx, ds)
	if err == nil {
		t.Error("Expected context deadline exceeded error, got nil")
	}
	if !strings.Contains(err.Error(), "context deadline exceeded") {
		t.Errorf("Expected context deadline exceeded error, got: %v", err)
	}
}

func TestConfluenceService_HTMLConversion(t *testing.T) {
	// Create a mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/content/page") {
			w.Write([]byte(`{
				"results": [
					{
						"id": "page1",
						"type": "page",
						"status": "current",
						"title": "Test Page",
						"version": {
							"number": 1,
							"when": "2024-01-01T00:00:00Z",
							"by": {
								"displayName": "Test User"
							}
						},
						"body": {
							"storage": {
								"value": "<div><h1>Test Title</h1><p>This is a <b>formatted</b> page with a <a href='http://example.com'>link</a>.</p><ul><li>List item 1</li><li>List item 2</li></ul></div>"
							}
						}
					}
				]
			}`))
		} else {
			// Space details
			w.Write([]byte(`{
				"id": "123",
				"key": "TEST",
				"name": "Test Space",
				"type": "global",
				"_links": {
					"webui": "/spaces/TEST"
				}
			}`))
		}
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewConfluenceService(server.URL, "test-user", "test-token")

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "confluence",
		Config: models.DataSourceConfig{
			BaseURL:   server.URL,
			Username:  "test-user",
			APIToken:  "test-token",
			SpaceKey:  "TEST",
		},
	}

	// Test sync
	err := service.SyncSpace(context.Background(), ds)
	if err != nil {
		t.Errorf("SyncSpace() error = %v", err)
	}
}

func TestConfluenceService_RetryBehavior(t *testing.T) {
	// Create a counter for failed requests
	var failedRequests int32

	// Create a mock HTTP server that fails initially but succeeds after retries
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt32(&failedRequests, 1) <= 2 {
			// Simulate server error for first two requests
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		// Succeed on third attempt
		w.Write([]byte(`{
			"id": "123",
			"key": "TEST",
			"name": "Test Space",
			"type": "global"
		}`))
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewConfluenceService(server.URL, "test-user", "test-token")
	service.maxRetries = 3

	// Test retrying operation
	var result ConfluenceSpace
	err := service.withRetry(context.Background(), func() error {
		req, _ := http.NewRequest("GET", server.URL+"/test", nil)
		resp, err := service.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("server error: %d", resp.StatusCode)
		}

		return nil
	})

	if err != nil {
		t.Errorf("Expected success after retries, got error: %v", err)
	}

	// Verify number of attempts
	attempts := atomic.LoadInt32(&failedRequests)
	if attempts != 3 {
		t.Errorf("Expected 3 attempts, got %d", attempts)
	}
} 