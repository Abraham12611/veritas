package sync

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/google/go-github/v57/github"
	"github.com/yourusername/veritas/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/time/rate"
)

// GitHubService handles syncing content from GitHub repositories
type GitHubService struct {
	client *github.Client
	limiter *rate.Limiter
	maxRetries int
}

// NewGitHubService creates a new GitHub sync service
func NewGitHubService(accessToken string) *GitHubService {
	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: accessToken},
	)
	tc := oauth2.NewClient(ctx, ts)

	// Create rate limiter: 5000 requests per hour (GitHub's limit)
	// This equals approximately 1.4 requests per second
	limiter := rate.NewLimiter(rate.Every(time.Second/1.4), 1)

	return &GitHubService{
		client: github.NewClient(tc),
		limiter: limiter,
		maxRetries: 3,
	}
}

// withRetry executes a function with retries and rate limiting
func (s *GitHubService) withRetry(ctx context.Context, operation func() error) error {
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
	
	// Check for rate limit errors
	if _, ok := err.(*github.RateLimitError); ok {
		return true
	}
	
	// Check for temporary GitHub errors
	if _, ok := err.(*github.AbuseRateLimitError); ok {
		return true
	}

	// Check for network-related errors
	if strings.Contains(err.Error(), "connection refused") ||
		strings.Contains(err.Error(), "timeout") ||
		strings.Contains(err.Error(), "temporary failure") {
		return true
	}

	return false
}

// SyncRepository syncs content from a GitHub repository
func (s *GitHubService) SyncRepository(ctx context.Context, ds *models.DataSource) error {
	// Extract repository information from config
	owner := ds.Config.Organization
	if owner == "" {
		parts := strings.Split(ds.Config.Repository, "/")
		if len(parts) != 2 {
			return fmt.Errorf("invalid repository format: %s", ds.Config.Repository)
		}
		owner = parts[0]
	}
	repo := strings.TrimPrefix(ds.Config.Repository, owner+"/")

	var contents []*github.RepositoryContent
	err := s.withRetry(ctx, func() error {
		_, c, _, err := s.client.Repositories.GetContents(ctx, owner, repo, "", nil)
		if err != nil {
			return err
		}
		contents = c
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to get repository contents: %w", err)
	}

	// Process repository contents
	for _, content := range contents {
		if err := s.processContent(ctx, ds, owner, repo, content); err != nil {
			return fmt.Errorf("failed to process content %s: %w", *content.Path, err)
		}
	}

	return nil
}

// processContent processes a single file or directory from GitHub
func (s *GitHubService) processContent(ctx context.Context, ds *models.DataSource, owner, repo string, content *github.RepositoryContent) error {
	// Skip if content is nil or has no path
	if content == nil || content.Path == nil {
		return nil
	}

	// Process directory
	if content.Type != nil && *content.Type == "dir" {
		return s.processDirectory(ctx, ds, owner, repo, *content.Path)
	}

	// Skip files we don't want to process
	if !s.shouldProcessFile(*content.Path) {
		return nil
	}

	// Get file content with retries
	fileContent, err := s.getFileContent(ctx, owner, repo, *content.Path)
	if err != nil {
		return fmt.Errorf("failed to get file content: %w", err)
	}

	// Create document input
	input := models.CreateDocumentInput{
		InstanceID:   ds.InstanceID,
		DataSourceID: ds.ID,
		Title:        *content.Path,
		Content:      fileContent,
		URL:         *content.HTMLURL,
		Type:        s.getDocumentType(*content.Path),
		Metadata: models.Metadata{
			SourcePath: *content.Path,
			ExternalID: *content.SHA,
			Extra: map[string]interface{}{
				"size":         content.Size,
				"download_url": content.DownloadURL,
			},
		},
	}

	// TODO: Call ingestion service to process the document
	// For now, we'll just log
	fmt.Printf("Would process document: %s\n", input.Title)

	return nil
}

// processDirectory processes a directory from GitHub
func (s *GitHubService) processDirectory(ctx context.Context, ds *models.DataSource, owner, repo, path string) error {
	var contents []*github.RepositoryContent
	err := s.withRetry(ctx, func() error {
		_, c, _, err := s.client.Repositories.GetContents(ctx, owner, repo, path, nil)
		if err != nil {
			return err
		}
		contents = c
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to get directory contents: %w", err)
	}

	for _, content := range contents {
		if err := s.processContent(ctx, ds, owner, repo, content); err != nil {
			return err
		}
	}

	return nil
}

// getFileContent retrieves and decodes the content of a file
func (s *GitHubService) getFileContent(ctx context.Context, owner, repo, path string) (string, error) {
	var content *github.RepositoryContent
	err := s.withRetry(ctx, func() error {
		c, _, _, err := s.client.Repositories.GetContents(ctx, owner, repo, path, nil)
		if err != nil {
			return err
		}
		content = c
		return nil
	})
	if err != nil {
		return "", err
	}

	if content.Content == nil {
		return "", fmt.Errorf("no content found for file: %s", path)
	}

	// Decode base64 content
	decoded, err := base64.StdEncoding.DecodeString(*content.Content)
	if err != nil {
		return "", fmt.Errorf("failed to decode content: %w", err)
	}

	return string(decoded), nil
}

// shouldProcessFile determines if a file should be processed based on its extension
func (s *GitHubService) shouldProcessFile(path string) bool {
	// List of file extensions we want to process
	validExtensions := map[string]bool{
		".md":    true,
		".mdx":   true,
		".txt":   true,
		".rst":   true,
		".json":  true,
		".yaml":  true,
		".yml":   true,
		".go":    true,
		".js":    true,
		".ts":    true,
		".jsx":   true,
		".tsx":   true,
		".py":    true,
		".java":  true,
		".rb":    true,
		".php":   true,
		".swift": true,
		".kt":    true,
	}

	// Get file extension
	ext := strings.ToLower(path[strings.LastIndex(path, ".")+1:])
	return validExtensions["."+ext]
}

// getDocumentType determines the document type based on file extension
func (s *GitHubService) getDocumentType(path string) string {
	ext := strings.ToLower(path[strings.LastIndex(path, ".")+1:])
	switch ext {
	case "md", "mdx":
		return "markdown"
	case "txt", "rst":
		return "text"
	default:
		return "text" // Default to text for code files
	}
} 