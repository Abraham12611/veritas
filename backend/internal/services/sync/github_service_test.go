package sync

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/Abraham12611/veritas/internal/models"
)

func TestGitHubService_ShouldProcessFile(t *testing.T) {
	service := NewGitHubService("dummy-token")

	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"Markdown file", "docs/README.md", true},
		{"TypeScript file", "src/app.ts", true},
		{"Go file", "pkg/service.go", true},
		{"Binary file", "bin/executable", false},
		{"Image file", "assets/logo.png", false},
		{"Hidden file", ".env", false},
		{"Package JSON", "package.json", true},
		{"YAML config", "config.yaml", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.shouldProcessFile(tt.path)
			if result != tt.expected {
				t.Errorf("shouldProcessFile(%s) = %v, want %v", tt.path, result, tt.expected)
			}
		})
	}
}

func TestGitHubService_GetDocumentType(t *testing.T) {
	service := NewGitHubService("dummy-token")

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"Markdown file", "docs/README.md", "markdown"},
		{"MDX file", "docs/guide.mdx", "markdown"},
		{"Text file", "notes.txt", "text"},
		{"RST file", "docs/index.rst", "text"},
		{"Go file", "main.go", "text"},
		{"TypeScript file", "app.ts", "text"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getDocumentType(tt.path)
			if result != tt.expected {
				t.Errorf("getDocumentType(%s) = %s, want %s", tt.path, result, tt.expected)
			}
		})
	}
}

func TestGitHubService_SyncRepository(t *testing.T) {
	// Skip if no GitHub token is provided
	t.Skip("Skipping GitHub API test - requires valid token")

	ctx := context.Background()
	service := NewGitHubService("your-github-token")

	// Create a test data source
	ds := &models.DataSource{
		ID:         uuid.New(),
		InstanceID: uuid.New(),
		Type:       "github",
		Config: models.DataSourceConfig{
			Repository:   "Abraham12611/veritas",
			AccessToken: "your-github-token",
		},
	}

	// Test sync repository
	err := service.SyncRepository(ctx, ds)
	if err != nil {
		t.Errorf("SyncRepository() error = %v", err)
	}
} 