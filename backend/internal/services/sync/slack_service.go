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

// SlackService handles syncing content from Slack
type SlackService struct {
	client      *http.Client
	limiter     *rate.Limiter
	maxRetries  int
	token       string
	concurrency int
	baseURL     string
}

// NewSlackService creates a new Slack sync service
func NewSlackService(token string) *SlackService {
	// Create HTTP client with reasonable timeouts
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create rate limiter: 20 requests per minute (Slack's Tier 3 limit)
	limiter := rate.NewLimiter(rate.Every(time.Minute/20), 1)

	return &SlackService{
		client:      client,
		limiter:     limiter,
		maxRetries:  3,
		token:       token,
		concurrency: 5, // Process 5 channels concurrently
		baseURL:     "https://slack.com/api",
	}
}

// withRetry executes a function with retries and rate limiting
func (s *SlackService) withRetry(ctx context.Context, operation func() error) error {
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

// SyncChannels syncs content from specified Slack channels
func (s *SlackService) SyncChannels(ctx context.Context, ds *models.DataSource) error {
	logger.Info("Starting Slack channel sync", logger.Fields{
		"dataSourceId": ds.ID,
		"channels":     ds.Config.Channels,
	})

	// Create error group for concurrent processing
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(s.concurrency)

	// Process each channel
	for _, channelID := range ds.Config.Channels {
		channelID := channelID // Create new variable for goroutine
		g.Go(func() error {
			return s.syncChannel(ctx, ds, channelID)
		})
	}

	// Wait for all channels to be processed
	if err := g.Wait(); err != nil {
		return fmt.Errorf("error during sync: %w", err)
	}

	logger.Info("Completed Slack channel sync", logger.Fields{
		"dataSourceId": ds.ID,
		"channels":     ds.Config.Channels,
	})

	return nil
}

// syncChannel syncs content from a single channel
func (s *SlackService) syncChannel(ctx context.Context, ds *models.DataSource, channelID string) error {
	// Get channel info
	channel, err := s.getChannelInfo(ctx, channelID)
	if err != nil {
		return fmt.Errorf("failed to get channel info: %w", err)
	}

	// Create error group for concurrent message processing
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(s.concurrency)

	// Channel for messages to process
	messagesChan := make(chan SlackMessage, s.concurrency*2)

	// Start message processor workers
	var processWg sync.WaitGroup
	processWg.Add(s.concurrency)
	for i := 0; i < s.concurrency; i++ {
		g.Go(func() error {
			defer processWg.Done()
			for msg := range messagesChan {
				select {
				case <-ctx.Done():
					return ctx.Err()
				default:
					if err := s.processMessage(ctx, ds, channel, msg); err != nil {
						logger.Error("Failed to process message", err, logger.Fields{
							"channelId": channelID,
							"messageTs": msg.Timestamp,
						})
						continue
					}
				}
			}
			return nil
		})
	}

	// Start message fetcher
	g.Go(func() error {
		defer close(messagesChan)

		var cursor string
		for {
			messages, nextCursor, err := s.getMessages(ctx, channelID, cursor)
			if err != nil {
				return fmt.Errorf("failed to get messages: %w", err)
			}

			// Send messages to processor
			for _, msg := range messages {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case messagesChan <- msg:
				}

				// If message has thread, process replies
				if msg.ThreadTimestamp != "" && msg.ThreadTimestamp == msg.Timestamp {
					replies, err := s.getThreadReplies(ctx, channelID, msg.Timestamp)
					if err != nil {
						logger.Error("Failed to get thread replies", err, logger.Fields{
							"channelId": channelID,
							"threadTs":  msg.Timestamp,
						})
						continue
					}

					for _, reply := range replies {
						select {
						case <-ctx.Done():
							return ctx.Err()
						case messagesChan <- reply:
						}
					}
				}
			}

			// Check if we've processed all messages
			if nextCursor == "" {
				break
			}
			cursor = nextCursor
		}

		return nil
	})

	// Wait for all goroutines to complete
	if err := g.Wait(); err != nil {
		return fmt.Errorf("error during channel sync: %w", err)
	}

	return nil
}

// getChannelInfo retrieves channel information
func (s *SlackService) getChannelInfo(ctx context.Context, channelID string) (*SlackChannel, error) {
	endpoint := fmt.Sprintf("%s/conversations.info", s.baseURL)
	
	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Add("channel", channelID)
	req.URL.RawQuery = q.Encode()

	req.Header.Set("Authorization", "Bearer "+s.token)

	var response struct {
		OK      bool         `json:"ok"`
		Error   string       `json:"error,omitempty"`
		Channel SlackChannel `json:"channel"`
	}

	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get channel info: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&response)
	})

	if err != nil {
		return nil, err
	}

	if !response.OK {
		return nil, fmt.Errorf("slack API error: %s", response.Error)
	}

	return &response.Channel, nil
}

// getMessages retrieves messages from a channel
func (s *SlackService) getMessages(ctx context.Context, channelID string, cursor string) ([]SlackMessage, string, error) {
	endpoint := fmt.Sprintf("%s/conversations.history", s.baseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, "", err
	}

	q := req.URL.Query()
	q.Add("channel", channelID)
	q.Add("limit", "100")
	if cursor != "" {
		q.Add("cursor", cursor)
	}
	req.URL.RawQuery = q.Encode()

	req.Header.Set("Authorization", "Bearer "+s.token)

	var response struct {
		OK                bool           `json:"ok"`
		Error            string         `json:"error,omitempty"`
		Messages         []SlackMessage `json:"messages"`
		ResponseMetadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get messages: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&response)
	})

	if err != nil {
		return nil, "", err
	}

	if !response.OK {
		return nil, "", fmt.Errorf("slack API error: %s", response.Error)
	}

	return response.Messages, response.ResponseMetadata.NextCursor, nil
}

// getThreadReplies retrieves replies in a message thread
func (s *SlackService) getThreadReplies(ctx context.Context, channelID string, threadTS string) ([]SlackMessage, error) {
	endpoint := fmt.Sprintf("%s/conversations.replies", s.baseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Add("channel", channelID)
	q.Add("ts", threadTS)
	req.URL.RawQuery = q.Encode()

	req.Header.Set("Authorization", "Bearer "+s.token)

	var response struct {
		OK       bool           `json:"ok"`
		Error    string         `json:"error,omitempty"`
		Messages []SlackMessage `json:"messages"`
	}

	err = s.withRetry(ctx, func() error {
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to get thread replies: status %d: %s", resp.StatusCode, string(body))
		}

		return json.NewDecoder(resp.Body).Decode(&response)
	})

	if err != nil {
		return nil, err
	}

	if !response.OK {
		return nil, fmt.Errorf("slack API error: %s", response.Error)
	}

	return response.Messages[1:], nil // Skip the parent message
}

// processMessage processes a single Slack message
func (s *SlackService) processMessage(ctx context.Context, ds *models.DataSource, channel *SlackChannel, msg SlackMessage) error {
	logger.Debug("Processing Slack message", logger.Fields{
		"channelId": channel.ID,
		"messageTs": msg.Timestamp,
	})

	// Build message content
	var content strings.Builder
	content.WriteString(msg.Text)

	// Process attachments
	if len(msg.Attachments) > 0 {
		content.WriteString("\n\nAttachments:\n")
		for _, att := range msg.Attachments {
			if att.Title != "" {
				content.WriteString(fmt.Sprintf("\n%s", att.Title))
				if att.TitleLink != "" {
					content.WriteString(fmt.Sprintf(" (%s)", att.TitleLink))
				}
				content.WriteString("\n")
			}
			if att.Text != "" {
				content.WriteString(att.Text)
				content.WriteString("\n")
			}
			if att.ImageURL != "" {
				content.WriteString(fmt.Sprintf("![Image](%s)\n", att.ImageURL))
			}
			if att.FileURL != "" {
				content.WriteString(fmt.Sprintf("[File](%s)\n", att.FileURL))
			}
		}
	}

	// Create document input
	input := models.CreateDocumentInput{
		InstanceID:   ds.InstanceID,
		DataSourceID: ds.ID,
		Title:        fmt.Sprintf("Message in #%s at %s", channel.Name, msg.Timestamp),
		Content:      content.String(),
		URL:         fmt.Sprintf("https://slack.com/archives/%s/p%s", channel.ID, strings.Replace(msg.Timestamp, ".", "", 1)),
		Type:        "slack",
		Metadata: models.Metadata{
			SourcePath: fmt.Sprintf("/channels/%s/messages/%s", channel.ID, msg.Timestamp),
			ExternalID: msg.Timestamp,
			Extra: map[string]interface{}{
				"channelId":       channel.ID,
				"channelName":     channel.Name,
				"userId":          msg.User,
				"threadTimestamp": msg.ThreadTimestamp,
				"hasAttachments": len(msg.Attachments) > 0,
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

// SlackChannel represents a Slack channel
type SlackChannel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	IsArchived  bool   `json:"is_archived"`
	IsPrivate   bool   `json:"is_private"`
	Creator     string `json:"creator"`
	CreatedTime int64  `json:"created"`
	Topic       struct {
		Value   string `json:"value"`
		Creator string `json:"creator"`
	} `json:"topic"`
	Purpose struct {
		Value   string `json:"value"`
		Creator string `json:"creator"`
	} `json:"purpose"`
}

// SlackMessage represents a message in Slack
type SlackMessage struct {
	Type            string           `json:"type"`
	User            string           `json:"user"`
	Text            string           `json:"text"`
	Timestamp       string           `json:"ts"`
	ThreadTimestamp string           `json:"thread_ts,omitempty"`
	ReplyCount      int             `json:"reply_count,omitempty"`
	Attachments     []SlackAttachment `json:"attachments,omitempty"`
}

// SlackAttachment represents a file or link attachment in a Slack message
type SlackAttachment struct {
	Title     string `json:"title"`
	TitleLink string `json:"title_link"`
	Text      string `json:"text"`
	ImageURL  string `json:"image_url"`
	FileURL   string `json:"file_url"`
	ThumbURL  string `json:"thumb_url"`
	Color     string `json:"color"`
} 