package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

type fakeOrchestrator struct {
	run func(context.Context, StartRunRequest, func(StreamEvent) error) error
}

func (f fakeOrchestrator) Run(ctx context.Context, req StartRunRequest, emit func(StreamEvent) error) error {
	return f.run(ctx, req, emit)
}

func TestHealthHandler(t *testing.T) {
	server := NewAPIServer(Config{}, fakeOrchestrator{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)

	server.handleHealth(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload map[string]bool
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal health payload: %v", err)
	}
	if !payload["ok"] {
		t.Fatalf("expected ok=true, got %#v", payload)
	}
}

func TestAgentRunWebSocketStreamsEvents(t *testing.T) {
	server := NewAPIServer(Config{}, fakeOrchestrator{
		run: func(ctx context.Context, req StartRunRequest, emit func(StreamEvent) error) error {
			if req.RunID != "run-1" {
				t.Fatalf("unexpected run id: %s", req.RunID)
			}
			if err := emit(NewEvent(req.RunID, "run_started", map[string]any{"mode": "test"})); err != nil {
				return err
			}
			if err := emit(NewEvent(req.RunID, "session_event", normalizedSessionEvent{
				ID:            "evt-1",
				InvocationID:  "inv-1",
				Author:        "analysis_agent",
				Partial:       true,
				TurnComplete:  false,
				FinalResponse: false,
				Text:          "Hello ",
			})); err != nil {
				return err
			}
			if err := emit(NewEvent(req.RunID, "session_event", normalizedSessionEvent{
				ID:            "evt-2",
				InvocationID:  "inv-1",
				Author:        "analysis_agent",
				Partial:       false,
				TurnComplete:  true,
				FinalResponse: true,
				Text:          "Hello world",
			})); err != nil {
				return err
			}
			return emit(NewEvent(req.RunID, "run_complete", map[string]any{"status": "completed"}))
		},
	})

	httpServer := httptest.NewServer(server.Handler())
	defer httpServer.Close()

	wsURL := "ws" + strings.TrimPrefix(httpServer.URL, "http") + "/ws/agent-run"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, http.Header{"Origin": []string{"http://example.test"}})
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close()

	if err := conn.WriteJSON(StartRunRequest{
		Type:     "start_run",
		RunID:    "run-1",
		Messages: []ChatMessage{{Role: "user", Content: "hello"}},
	}); err != nil {
		t.Fatalf("write start_run: %v", err)
	}

	var started StreamEvent
	if err := conn.ReadJSON(&started); err != nil {
		t.Fatalf("read run_started: %v", err)
	}
	if started.Type != "run_started" {
		t.Fatalf("expected run_started, got %s", started.Type)
	}

	var partialEvent StreamEvent
	if err := conn.ReadJSON(&partialEvent); err != nil {
		t.Fatalf("read first session_event: %v", err)
	}
	if partialEvent.Type != "session_event" {
		t.Fatalf("expected session_event, got %s", partialEvent.Type)
	}

	var finalEvent StreamEvent
	if err := conn.ReadJSON(&finalEvent); err != nil {
		t.Fatalf("read second session_event: %v", err)
	}
	if finalEvent.Type != "session_event" {
		t.Fatalf("expected session_event, got %s", finalEvent.Type)
	}

	var completed StreamEvent
	if err := conn.ReadJSON(&completed); err != nil {
		t.Fatalf("read run_complete: %v", err)
	}
	if completed.Type != "run_complete" {
		t.Fatalf("expected run_complete, got %s", completed.Type)
	}
}

func TestAgentRunWebSocketRejectsUnexpectedOrigin(t *testing.T) {
	server := NewAPIServer(Config{AllowedOrigins: []string{"http://allowed.test"}}, fakeOrchestrator{})
	httpServer := httptest.NewServer(server.Handler())
	defer httpServer.Close()

	wsURL := "ws" + strings.TrimPrefix(httpServer.URL, "http") + "/ws/agent-run"
	_, response, err := websocket.DefaultDialer.Dial(wsURL, http.Header{"Origin": []string{"http://denied.test"}})
	if err == nil {
		t.Fatal("expected websocket dial to fail for denied origin")
	}
	if response == nil || response.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 response, got %#v", response)
	}
}
