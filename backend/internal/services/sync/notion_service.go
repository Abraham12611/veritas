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

	"github.com/Abraham12611/veritas/internal/logger"
	"github.com/Abraham12611/veritas/internal/models"
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
	blocks, err := s.getBlocks(ctx, pageID)
	if err != nil {
		return "", err
	}

	var content strings.Builder
	for _, block := range blocks {
		if err := s.processBlock(&content, block, 0); err != nil {
			return "", err
		}
	}

	return content.String(), nil
}

// getBlocks recursively retrieves all blocks including nested ones
func (s *NotionService) getBlocks(ctx context.Context, blockID string) ([]NotionBlock, error) {
	endpoint := fmt.Sprintf("%s/blocks/%s/children", s.baseURL, blockID)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Notion-Version", "2022-06-28")

	var response struct {
		Results []NotionBlock `json:"results"`
		HasMore bool          `json:"has_more"`
		NextCursor string     `json:"next_cursor"`
	}

	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get blocks: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&response)
	})

	if err != nil {
		return nil, err
	}

	// Process nested blocks
	for i, block := range response.Results {
		if block.HasChildren {
			children, err := s.getBlocks(ctx, block.ID)
			if err != nil {
				return nil, err
			}
			response.Results[i].Children = children
		}
	}

	return response.Results, nil
}

// processBlock formats a block and its children into text
func (s *NotionService) processBlock(sb *strings.Builder, block NotionBlock, depth int) error {
	// Add indentation for nested blocks
	indent := strings.Repeat("  ", depth)

	switch block.Type {
	case "paragraph":
		if block.Paragraph != nil {
			s.processRichText(sb, block.Paragraph.RichText)
			sb.WriteString("\n\n")
		}

	case "heading_1":
		if block.Heading1 != nil {
			sb.WriteString("# ")
			s.processRichText(sb, block.Heading1.RichText)
			sb.WriteString("\n\n")
		}

	case "heading_2":
		if block.Heading2 != nil {
			sb.WriteString("## ")
			s.processRichText(sb, block.Heading2.RichText)
			sb.WriteString("\n\n")
		}

	case "heading_3":
		if block.Heading3 != nil {
			sb.WriteString("### ")
			s.processRichText(sb, block.Heading3.RichText)
			sb.WriteString("\n\n")
		}

	case "bulleted_list_item":
		if block.BulletList != nil {
			sb.WriteString(indent)
			sb.WriteString("• ")
			s.processRichText(sb, block.BulletList.RichText)
			sb.WriteString("\n")
		}

	case "numbered_list_item":
		if block.NumberList != nil {
			sb.WriteString(indent)
			sb.WriteString("1. ")
			s.processRichText(sb, block.NumberList.RichText)
			sb.WriteString("\n")
		}

	case "to_do":
		if block.ToDo != nil {
			sb.WriteString(indent)
			if block.ToDo.Checked {
				sb.WriteString("[x] ")
			} else {
				sb.WriteString("[ ] ")
			}
			s.processRichText(sb, block.ToDo.RichText)
			sb.WriteString("\n")
		}

	case "code":
		if block.Code != nil {
			sb.WriteString("```")
			sb.WriteString(block.Code.Language)
			sb.WriteString("\n")
			s.processRichText(sb, block.Code.RichText)
			sb.WriteString("\n```\n\n")
		}

	case "image":
		if block.Image != nil {
			url := s.getFileURL(block.Image)
			if url != "" {
				sb.WriteString("![")
				if len(block.Image.Caption) > 0 {
					s.processRichText(sb, block.Image.Caption)
				}
				sb.WriteString("](")
				sb.WriteString(url)
				sb.WriteString(")\n\n")
			}
		}

	case "file":
		if block.File != nil {
			url := s.getFileURL(block.File)
			if url != "" {
				sb.WriteString("[")
				if len(block.File.Caption) > 0 {
					s.processRichText(sb, block.File.Caption)
				} else {
					sb.WriteString("File")
				}
				sb.WriteString("](")
				sb.WriteString(url)
				sb.WriteString(")\n\n")
			}
		}
	}

	// Process nested blocks
	if len(block.Children) > 0 {
		for _, child := range block.Children {
			if err := s.processBlock(sb, child, depth+1); err != nil {
				return err
			}
		}
	}

	return nil
}

// processRichText formats rich text content
func (s *NotionService) processRichText(sb *strings.Builder, richText []NotionRichText) {
	for _, text := range richText {
		content := text.PlainText

		// Apply text formatting
		if text.Annotations.Code {
			sb.WriteString("`")
			sb.WriteString(content)
			sb.WriteString("`")
		} else {
			if text.Annotations.Bold {
				sb.WriteString("**")
			}
			if text.Annotations.Italic {
				sb.WriteString("_")
			}
			if text.Annotations.Strikethrough {
				sb.WriteString("~~")
			}
			
			// Add link if present
			if text.Href != "" {
				sb.WriteString("[")
				sb.WriteString(content)
				sb.WriteString("](")
				sb.WriteString(text.Href)
				sb.WriteString(")")
			} else {
				sb.WriteString(content)
			}

			if text.Annotations.Strikethrough {
				sb.WriteString("~~")
			}
			if text.Annotations.Italic {
				sb.WriteString("_")
			}
			if text.Annotations.Bold {
				sb.WriteString("**")
			}
		}
	}
}

// getFileURL returns the appropriate URL for a file or image
func (s *NotionService) getFileURL(file *NotionFile) string {
	if file == nil {
		return ""
	}

	switch file.Type {
	case "external":
		if file.External != nil {
			return file.External.URL
		}
	case "file":
		if file.File != nil {
			return file.File.URL
		}
	}
	return ""
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
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	HasChildren bool                   `json:"has_children"`
	CreatedTime string                 `json:"created_time"`
	LastEdited  string                 `json:"last_edited_time"`
	Paragraph   *NotionParagraph       `json:"paragraph,omitempty"`
	Heading1    *NotionHeading         `json:"heading_1,omitempty"`
	Heading2    *NotionHeading         `json:"heading_2,omitempty"`
	Heading3    *NotionHeading         `json:"heading_3,omitempty"`
	BulletList  *NotionListItem        `json:"bulleted_list_item,omitempty"`
	NumberList  *NotionListItem        `json:"numbered_list_item,omitempty"`
	ToDo        *NotionToDo            `json:"to_do,omitempty"`
	Code        *NotionCode            `json:"code,omitempty"`
	Image       *NotionFile            `json:"image,omitempty"`
	File        *NotionFile            `json:"file,omitempty"`
	Children    []NotionBlock          `json:"children,omitempty"`
}

// NotionRichText represents rich text content
type NotionRichText struct {
	Type        string `json:"type"`
	PlainText   string `json:"plain_text"`
	Annotations struct {
		Bold          bool   `json:"bold"`
		Italic        bool   `json:"italic"`
		Strikethrough bool   `json:"strikethrough"`
		Underline     bool   `json:"underline"`
		Code          bool   `json:"code"`
		Color         string `json:"color"`
	} `json:"annotations"`
	Href string `json:"href,omitempty"`
}

// NotionParagraph represents a paragraph block
type NotionParagraph struct {
	RichText []NotionRichText `json:"rich_text"`
	Color    string           `json:"color"`
}

// NotionHeading represents a heading block
type NotionHeading struct {
	RichText []NotionRichText `json:"rich_text"`
	Color    string           `json:"color"`
	IsToggleable bool         `json:"is_toggleable"`
}

// NotionListItem represents a list item block
type NotionListItem struct {
	RichText []NotionRichText `json:"rich_text"`
	Color    string           `json:"color"`
}

// NotionToDo represents a to-do block
type NotionToDo struct {
	RichText []NotionRichText `json:"rich_text"`
	Checked  bool             `json:"checked"`
	Color    string           `json:"color"`
}

// NotionCode represents a code block
type NotionCode struct {
	RichText []NotionRichText `json:"rich_text"`
	Language string           `json:"language"`
	Caption  []NotionRichText `json:"caption"`
}

// NotionFile represents a file or image block
type NotionFile struct {
	Type     string `json:"type"` // "file" or "external"
	File     *struct {
		URL        string `json:"url"`
		ExpiryTime string `json:"expiry_time"`
	} `json:"file,omitempty"`
	External *struct {
		URL string `json:"url"`
	} `json:"external,omitempty"`
	Caption []NotionRichText `json:"caption"`
} 