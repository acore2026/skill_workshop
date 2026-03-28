package server

import "time"

type StreamEvent struct {
	Type      string `json:"type"`
	RunID     string `json:"run_id"`
	Timestamp string `json:"timestamp"`
	Payload   any    `json:"payload,omitempty"`
}

func NewEvent(runID, eventType string, payload any) StreamEvent {
	return StreamEvent{
		Type:      eventType,
		RunID:     runID,
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Payload:   payload,
	}
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type StartRunRequest struct {
	Type             string         `json:"type"`
	RunID            string         `json:"run_id"`
	Messages         []ChatMessage  `json:"messages"`
	CurrentSkillYAML string         `json:"current_skill_yaml"`
	Context          map[string]any `json:"context"`
}

type ToolCallPayload struct {
	Name string         `json:"name"`
	Args map[string]any `json:"args,omitempty"`
}

type ToolResultPayload struct {
	Name    string `json:"name"`
	OK      bool   `json:"ok"`
	Summary string `json:"summary"`
}

type AssistantMessagePayload struct {
	MessageID string `json:"message_id"`
	Stage     string `json:"stage"`
	Content   string `json:"content"`
}

type AssistantMessageStartPayload struct {
	MessageID string `json:"message_id"`
	Stage     string `json:"stage"`
}

type YAMLPayload struct {
	Stage   string `json:"stage"`
	Content string `json:"content"`
}
