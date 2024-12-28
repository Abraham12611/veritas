package rag

import (
	"context"
	"os"
	"testing"
)

func TestOpenAIClient_CreateEmbedding(t *testing.T) {
	// Skip if no API key is provided
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		t.Skip("Skipping OpenAI API test - OPENAI_API_KEY not set")
	}

	client := NewOpenAIClient(apiKey, "gpt-4-turbo-preview")
	ctx := context.Background()

	tests := []struct {
		name    string
		text    string
		wantErr bool
	}{
		{
			name:    "Basic text",
			text:    "This is a test sentence.",
			wantErr: false,
		},
		{
			name:    "Empty text",
			text:    "",
			wantErr: true,
		},
		{
			name:    "Long text",
			text:    "This is a very long text that should still work but will be truncated if it exceeds the model's maximum token limit. " + "Lorem ipsum dolor sit amet. ".repeat(100),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			embedding, err := client.CreateEmbedding(ctx, tt.text)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateEmbedding() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if len(embedding) == 0 {
					t.Error("Expected non-empty embedding")
				}
			}
		})
	}
}

func TestOpenAIClient_Complete(t *testing.T) {
	// Skip if no API key is provided
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		t.Skip("Skipping OpenAI API test - OPENAI_API_KEY not set")
	}

	client := NewOpenAIClient(apiKey, "gpt-4-turbo-preview")
	ctx := context.Background()

	tests := []struct {
		name    string
		req     CompletionRequest
		wantErr bool
	}{
		{
			name: "Basic completion",
			req: CompletionRequest{
				SystemPrompt: "You are a helpful assistant.",
				UserPrompt:   "What is 2+2?",
				Temperature: 0.7,
				MaxTokens:   100,
			},
			wantErr: false,
		},
		{
			name: "Empty prompt",
			req: CompletionRequest{
				SystemPrompt: "You are a helpful assistant.",
				UserPrompt:   "",
				Temperature: 0.7,
				MaxTokens:   100,
			},
			wantErr: true,
		},
		{
			name: "Complex prompt",
			req: CompletionRequest{
				SystemPrompt: "You are a technical expert.",
				UserPrompt:   "Explain how a binary search algorithm works.",
				Temperature: 0.7,
				MaxTokens:   500,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			completion, err := client.Complete(ctx, tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("Complete() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if completion == "" {
					t.Error("Expected non-empty completion")
				}
			}
		})
	}
}

func TestOpenAIClient_RetryBehavior(t *testing.T) {
	// Skip if no API key is provided
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		t.Skip("Skipping OpenAI API test - OPENAI_API_KEY not set")
	}

	client := NewOpenAIClient(apiKey, "gpt-4-turbo-preview")
	ctx := context.Background()

	// Test rapid requests to trigger rate limits
	for i := 0; i < 5; i++ {
		_, err := client.CreateEmbedding(ctx, "Test text")
		if err != nil {
			// Error should be handled by retry mechanism
			t.Logf("Request %d error: %v", i, err)
		}
	}
}

func TestOpenAIClient_ConcurrentRequests(t *testing.T) {
	// Skip if no API key is provided
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		t.Skip("Skipping OpenAI API test - OPENAI_API_KEY not set")
	}

	client := NewOpenAIClient(apiKey, "gpt-4-turbo-preview")
	ctx := context.Background()

	// Create channels for results
	type result struct {
		embedding []float32
		err       error
	}
	results := make(chan result, 3)

	// Make concurrent requests
	for i := 0; i < 3; i++ {
		go func(i int) {
			embedding, err := client.CreateEmbedding(ctx, "Test text "+string(i))
			results <- result{embedding, err}
		}(i)
	}

	// Collect results
	for i := 0; i < 3; i++ {
		res := <-results
		if res.err != nil {
			t.Errorf("Concurrent request %d failed: %v", i, res.err)
		}
		if len(res.embedding) == 0 {
			t.Errorf("Concurrent request %d returned empty embedding", i)
		}
	}
} 