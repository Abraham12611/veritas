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
	"github.com/yourusername/veritas/internal/models"
)

func TestSlackService_SyncChannels(t *testing.T) {
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
			w.Write([]byte(`{"ok":false,"error":"rate_limited"}`))
			return
		}

		// Handle different endpoints
		switch {
		case strings.Contains(r.URL.Path, "/conversations.info"):
			// Channel info
			w.Write([]byte(`{
				"ok": true,
				"channel": {
					"id": "C123456",
					"name": "general",
					"is_archived": false,
					"is_private": false,
					"creator": "U123456",
					"created": 1622505600,
					"topic": {
						"value": "Company discussions",
						"creator": "U123456"
					},
					"purpose": {
						"value": "General company discussions",
						"creator": "U123456"
					}
				}
			}`))

		case strings.Contains(r.URL.Path, "/conversations.history"):
			// Channel messages
			w.Write([]byte(`{
				"ok": true,
				"messages": [
					{
						"type": "message",
						"user": "U123456",
						"text": "Hello world!",
						"ts": "1622505600.000100",
						"thread_ts": "1622505600.000100",
						"reply_count": 2,
						"attachments": [
							{
								"title": "Test Attachment",
								"title_link": "https://example.com",
								"text": "Attachment content",
								"image_url": "https://example.com/image.png"
							}
						]
					}
				],
				"response_metadata": {
					"next_cursor": ""
				}
			}`))

		case strings.Contains(r.URL.Path, "/conversations.replies"):
			// Thread replies
			w.Write([]byte(`{
				"ok": true,
				"messages": [
					{
						"type": "message",
						"user": "U123456",
						"text": "Hello world!",
						"ts": "1622505600.000100"
					},
					{
						"type": "message",
						"user": "U234567",
						"text": "Reply 1",
						"ts": "1622505601.000100",
						"thread_ts": "1622505600.000100"
					},
					{
						"type": "message",
						"user": "U345678",
						"text": "Reply 2",
						"ts": "1622505602.000100",
						"thread_ts": "1622505600.000100"
					}
				]
			}`))

		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewSlackService("test-token")
	service.baseURL = server.URL
	service.concurrency = 2 // Use 2 workers for testing

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "slack",
		Config: models.DataSourceConfig{
			Channels: []string{"C123456"},
			APIToken: "test-token",
		},
	}

	// Test sync
	err := service.SyncChannels(context.Background(), ds)
	if err != nil {
		t.Errorf("SyncChannels() error = %v", err)
	}

	// Verify request count is reasonable
	count := atomic.LoadInt32(&requestCount)
	if count < 3 { // Channel info, history, and replies
		t.Errorf("Expected at least 3 requests, got %d", count)
	}
}

func TestSlackService_RateLimiting(t *testing.T) {
	// Create a mock HTTP server that always returns rate limit error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"ok":false,"error":"rate_limited"}`))
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewSlackService("test-token")
	service.baseURL = server.URL
	service.maxRetries = 2 // Reduce retries for faster test

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "slack",
		Config: models.DataSourceConfig{
			Channels: []string{"C123456"},
			APIToken: "test-token",
		},
	}

	// Test sync with rate limiting
	err := service.SyncChannels(context.Background(), ds)
	if err == nil {
		t.Error("Expected rate limit error, got nil")
	}
	if !strings.Contains(err.Error(), "rate_limited") {
		t.Errorf("Expected rate limit error, got: %v", err)
	}
}

func TestSlackService_Cancellation(t *testing.T) {
	// Create a mock HTTP server that delays responses
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewSlackService("test-token")
	service.baseURL = server.URL

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "slack",
		Config: models.DataSourceConfig{
			Channels: []string{"C123456"},
			APIToken: "test-token",
		},
	}

	// Create cancellable context
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	// Test sync with cancellation
	err := service.SyncChannels(ctx, ds)
	if err == nil {
		t.Error("Expected context deadline exceeded error, got nil")
	}
	if !strings.Contains(err.Error(), "context deadline exceeded") {
		t.Errorf("Expected context deadline exceeded error, got: %v", err)
	}
}

func TestSlackService_MessageProcessing(t *testing.T) {
	// Create a mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/conversations.info") {
			w.Write([]byte(`{
				"ok": true,
				"channel": {
					"id": "C123456",
					"name": "general"
				}
			}`))
			return
		}

		if strings.Contains(r.URL.Path, "/conversations.history") {
			w.Write([]byte(`{
				"ok": true,
				"messages": [
					{
						"type": "message",
						"user": "U123456",
						"text": "Message with *formatting* and <https://example.com|link>",
						"ts": "1622505600.000100",
						"attachments": [
							{
								"title": "Image Attachment",
								"image_url": "https://example.com/image.png"
							},
							{
								"title": "File Attachment",
								"title_link": "https://example.com/file.pdf",
								"file_url": "https://example.com/file.pdf"
							}
						]
					}
				],
				"response_metadata": {
					"next_cursor": ""
				}
			}`))
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewSlackService("test-token")
	service.baseURL = server.URL

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "slack",
		Config: models.DataSourceConfig{
			Channels: []string{"C123456"},
			APIToken: "test-token",
		},
	}

	// Test sync
	err := service.SyncChannels(context.Background(), ds)
	if err != nil {
		t.Errorf("SyncChannels() error = %v", err)
	}
}

func TestSlackService_ThreadProcessing(t *testing.T) {
	var messageCount int32

	// Create a mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/conversations.info") {
			w.Write([]byte(`{
				"ok": true,
				"channel": {
					"id": "C123456",
					"name": "general"
				}
			}`))
			return
		}

		if strings.Contains(r.URL.Path, "/conversations.history") {
			w.Write([]byte(`{
				"ok": true,
				"messages": [
					{
						"type": "message",
						"user": "U123456",
						"text": "Parent message",
						"ts": "1622505600.000100",
						"thread_ts": "1622505600.000100",
						"reply_count": 2
					}
				],
				"response_metadata": {
					"next_cursor": ""
				}
			}`))
			return
		}

		if strings.Contains(r.URL.Path, "/conversations.replies") {
			atomic.AddInt32(&messageCount, 1)
			w.Write([]byte(`{
				"ok": true,
				"messages": [
					{
						"type": "message",
						"user": "U123456",
						"text": "Parent message",
						"ts": "1622505600.000100"
					},
					{
						"type": "message",
						"user": "U234567",
						"text": "Reply 1",
						"ts": "1622505601.000100",
						"thread_ts": "1622505600.000100"
					},
					{
						"type": "message",
						"user": "U345678",
						"text": "Reply 2",
						"ts": "1622505602.000100",
						"thread_ts": "1622505600.000100"
					}
				]
			}`))
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewSlackService("test-token")
	service.baseURL = server.URL

	// Create test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "slack",
		Config: models.DataSourceConfig{
			Channels: []string{"C123456"},
			APIToken: "test-token",
		},
	}

	// Test sync
	err := service.SyncChannels(context.Background(), ds)
	if err != nil {
		t.Errorf("SyncChannels() error = %v", err)
	}

	// Verify thread processing
	count := atomic.LoadInt32(&messageCount)
	if count != 1 {
		t.Errorf("Expected 1 thread to be processed, got %d", count)
	}
} 