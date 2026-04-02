package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/adk/model"
	"google.golang.org/genai"
)

func TestMapOpenAIRole(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{input: "", want: "user"},
		{input: "user", want: "user"},
		{input: "model", want: "assistant"},
		{input: "assistant", want: "assistant"},
		{input: "tool", want: "tool"},
		{input: "function", want: "tool"},
		{input: "system", want: "system"},
		{input: "something-else", want: "user"},
	}

	for _, tt := range tests {
		if got := mapOpenAIRole(tt.input); got != tt.want {
			t.Fatalf("mapOpenAIRole(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestBuildContentFromOpenAIIncludesReasoningThoughtPart(t *testing.T) {
	content := buildContentFromOpenAI("final answer", "thinking stream", nil)
	if content == nil {
		t.Fatal("expected content")
	}
	if len(content.Parts) != 2 {
		t.Fatalf("expected 2 parts, got %d", len(content.Parts))
	}
	if !content.Parts[0].Thought || content.Parts[0].Text != "thinking stream" {
		t.Fatalf("expected first part to be thought reasoning, got %#v", content.Parts[0])
	}
	if content.Parts[1].Thought || content.Parts[1].Text != "final answer" {
		t.Fatalf("expected second part to be visible text, got %#v", content.Parts[1])
	}
}

func TestDoChatCompletionRequestIncludesMaxTokens(t *testing.T) {
	var captured openAIRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		if err := json.NewDecoder(r.Body).Decode(&captured); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"ok"},"finish_reason":"stop"}],"model":"kimi-k2.5"}`))
	}))
	defer server.Close()

	llm := NewOpenAICompatibleLLM("kimi-k2.5", server.URL, "test-key")
	_, err := llm.generate(context.Background(), &model.LLMRequest{
		Model: "kimi-k2.5",
		Contents: []*genai.Content{
			genai.NewContentFromText("hello", genai.RoleUser),
		},
		Config: &genai.GenerateContentConfig{
			MaxOutputTokens: 80,
		},
	}, false)
	if err != nil {
		t.Fatalf("generate() error = %v", err)
	}

	if captured.MaxTokens == nil || *captured.MaxTokens != 80 {
		t.Fatalf("expected max_tokens=80, got %#v", captured.MaxTokens)
	}
}

func TestDoChatCompletionRequestCanDisableThinking(t *testing.T) {
	var captured openAIRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		if err := json.NewDecoder(r.Body).Decode(&captured); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"ok"},"finish_reason":"stop"}],"model":"kimi-k2.5"}`))
	}))
	defer server.Close()

	llm := NewOpenAICompatibleLLM("kimi-k2.5", server.URL, "test-key").WithThinkingEnabled(false)
	_, err := llm.generate(context.Background(), &model.LLMRequest{
		Model: "kimi-k2.5",
		Contents: []*genai.Content{
			genai.NewContentFromText("hello", genai.RoleUser),
		},
	}, false)
	if err != nil {
		t.Fatalf("generate() error = %v", err)
	}

	if captured.Thinking == nil || captured.Thinking.Type != "disabled" {
		t.Fatalf("expected thinking disabled payload, got %#v", captured.Thinking)
	}
}
