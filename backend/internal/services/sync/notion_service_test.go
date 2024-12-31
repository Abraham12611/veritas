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

func TestNotionService_BlockParsing(t *testing.T) {
	// Create a mock HTTP server that returns complex block structure
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/blocks/") {
			w.Write([]byte(`{
				"results": [
					{
						"id": "block1",
						"type": "paragraph",
						"paragraph": {
							"rich_text": [
								{
									"type": "text",
									"plain_text": "This is a ",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								},
								{
									"type": "text",
									"plain_text": "formatted",
									"annotations": {
										"bold": true,
										"italic": true,
										"code": false
									}
								},
								{
									"type": "text",
									"plain_text": " paragraph with a ",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								},
								{
									"type": "text",
									"plain_text": "link",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									},
									"href": "https://example.com"
								}
							],
							"color": "default"
						},
						"has_children": true
					},
					{
						"id": "block2",
						"type": "heading_1",
						"heading_1": {
							"rich_text": [
								{
									"type": "text",
									"plain_text": "Main Heading",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								}
							],
							"color": "default"
						},
						"has_children": false
					},
					{
						"id": "block3",
						"type": "bulleted_list_item",
						"bulleted_list_item": {
							"rich_text": [
								{
									"type": "text",
									"plain_text": "List item with ",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								},
								{
									"type": "text",
									"plain_text": "code",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": true
									}
								}
							],
							"color": "default"
						},
						"has_children": false
					},
					{
						"id": "block4",
						"type": "code",
						"code": {
							"rich_text": [
								{
									"type": "text",
									"plain_text": "func main() {\n    fmt.Println(\"Hello\")\n}",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								}
							],
							"language": "go"
						},
						"has_children": false
					},
					{
						"id": "block5",
						"type": "image",
						"image": {
							"type": "external",
							"external": {
								"url": "https://example.com/image.png"
							},
							"caption": [
								{
									"type": "text",
									"plain_text": "Image caption",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								}
							]
						},
						"has_children": false
					}
				],
				"next_cursor": null,
				"has_more": false
			}`))
			return
		}

		// Return child blocks for block1
		if strings.Contains(r.URL.Path, "/block1/children") {
			w.Write([]byte(`{
				"results": [
					{
						"id": "block1.1",
						"type": "paragraph",
						"paragraph": {
							"rich_text": [
								{
									"type": "text",
									"plain_text": "This is a nested paragraph",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								}
							],
							"color": "default"
						},
						"has_children": false
					}
				],
				"next_cursor": null,
				"has_more": false
			}`))
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewNotionService("test-token")
	service.baseURL = server.URL

	// Test block parsing
	blocks, err := service.getBlocks(context.Background(), "test-page")
	if err != nil {
		t.Errorf("getBlocks() error = %v", err)
		return
	}

	// Verify block count
	if len(blocks) != 5 {
		t.Errorf("Expected 5 blocks, got %d", len(blocks))
	}

	// Verify nested blocks
	if !blocks[0].HasChildren {
		t.Error("Expected first block to have children")
	}

	if len(blocks[0].Children) != 1 {
		t.Errorf("Expected 1 child block, got %d", len(blocks[0].Children))
	}

	// Test content formatting
	var content strings.Builder
	err = service.processBlock(&content, blocks[0], 0)
	if err != nil {
		t.Errorf("processBlock() error = %v", err)
		return
	}

	expectedContent := "This is a **_formatted_** paragraph with a [link](https://example.com)\n\n  This is a nested paragraph\n\n"
	if content.String() != expectedContent {
		t.Errorf("Expected content:\n%q\nGot:\n%q", expectedContent, content.String())
	}

	// Test code block formatting
	content.Reset()
	err = service.processBlock(&content, blocks[3], 0)
	if err != nil {
		t.Errorf("processBlock() error = %v", err)
		return
	}

	expectedCode := "```go\nfunc main() {\n    fmt.Println(\"Hello\")\n}\n```\n\n"
	if content.String() != expectedCode {
		t.Errorf("Expected code:\n%q\nGot:\n%q", expectedCode, content.String())
	}

	// Test image block formatting
	content.Reset()
	err = service.processBlock(&content, blocks[4], 0)
	if err != nil {
		t.Errorf("processBlock() error = %v", err)
		return
	}

	expectedImage := "![Image caption](https://example.com/image.png)\n\n"
	if content.String() != expectedImage {
		t.Errorf("Expected image:\n%q\nGot:\n%q", expectedImage, content.String())
	}
}

func TestNotionService_NestedBlockPagination(t *testing.T) {
	var blockCount int32
	var requestCount int32

	// Create a mock HTTP server that returns paginated nested blocks
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)

		if strings.Contains(r.URL.Path, "/blocks/") {
			currentBlock := atomic.AddInt32(&blockCount, 1)
			hasMore := currentBlock < 3

			w.Write([]byte(fmt.Sprintf(`{
				"results": [
					{
						"id": "block%d",
						"type": "paragraph",
						"paragraph": {
							"rich_text": [
								{
									"type": "text",
									"plain_text": "Block %d content",
									"annotations": {
										"bold": false,
										"italic": false,
										"code": false
									}
								}
							]
						},
						"has_children": true
					}
				],
				"next_cursor": %s,
				"has_more": %v
			}`, currentBlock, currentBlock,
				map[bool]string{true: `"next-cursor"`, false: "null"}[hasMore],
				hasMore)))
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create service with mock server URL
	service := NewNotionService("test-token")
	service.baseURL = server.URL

	// Test nested block pagination
	blocks, err := service.getBlocks(context.Background(), "test-page")
	if err != nil {
		t.Errorf("getBlocks() error = %v", err)
		return
	}

	// Verify block count
	if len(blocks) != 3 {
		t.Errorf("Expected 3 blocks, got %d", len(blocks))
	}

	// Verify request count
	count := atomic.LoadInt32(&requestCount)
	expectedRequests := int32(3) // One request per block
	if count != expectedRequests {
		t.Errorf("Expected %d requests, got %d", expectedRequests, count)
	}
} 