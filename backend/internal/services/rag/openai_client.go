package rag

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
)

// OpenAIClient implements LLMClient using OpenAI's API
type OpenAIClient struct {
	apiKey     string
	httpClient *http.Client
	model      string
}

// OpenAIEmbeddingRequest represents a request to create embeddings
type OpenAIEmbeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

// OpenAIEmbeddingResponse represents the response from the embeddings API
type OpenAIEmbeddingResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
}

// OpenAIChatRequest represents a request to the chat completions API
type OpenAIChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIChatResponse represents the response from the chat completions API
type OpenAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// NewOpenAIClient creates a new OpenAI client
func NewOpenAIClient(apiKey string, model string) *OpenAIClient {
	return &OpenAIClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		model: model,
	}
}

// CreateEmbedding generates embeddings for the given text
func (c *OpenAIClient) CreateEmbedding(ctx context.Context, text string) ([]float32, error) {
	// Create request body
	reqBody := OpenAIEmbeddingRequest{
		Model: "text-embedding-ada-002",
		Input: []string{text},
	}

	// Marshal request body
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/embeddings", strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	// Execute request with retry
	var resp *http.Response
	operation := func() error {
		var err error
		resp, err = c.httpClient.Do(req)
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		}
		return nil
	}

	b := backoff.NewExponentialBackOff()
	b.MaxElapsedTime = 30 * time.Second

	if err := backoff.Retry(operation, b); err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Parse response
	var embeddingResp OpenAIEmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&embeddingResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(embeddingResp.Data) == 0 {
		return nil, fmt.Errorf("no embeddings returned")
	}

	return embeddingResp.Data[0].Embedding, nil
}

// Complete generates a completion for the given prompt
func (c *OpenAIClient) Complete(ctx context.Context, req CompletionRequest) (string, error) {
	// Create request body
	chatReq := OpenAIChatRequest{
		Model: c.model,
		Messages: []Message{
			{
				Role:    "system",
				Content: req.SystemPrompt,
			},
			{
				Role:    "user",
				Content: req.UserPrompt,
			},
		},
	}

	// Marshal request body
	jsonBody, err := json.Marshal(chatReq)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", strings.NewReader(string(jsonBody)))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	// Execute request with retry
	var resp *http.Response
	operation := func() error {
		var err error
		resp, err = c.httpClient.Do(httpReq)
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		}
		return nil
	}

	b := backoff.NewExponentialBackOff()
	b.MaxElapsedTime = 30 * time.Second

	if err := backoff.Retry(operation, b); err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Parse response
	var chatResp OpenAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no completions returned")
	}

	return chatResp.Choices[0].Message.Content, nil
} 