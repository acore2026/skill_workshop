package server

import (
	"strings"
	"time"

	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

type normalizedSessionEvent struct {
	ID                 string                     `json:"id"`
	Timestamp          string                     `json:"timestamp"`
	InvocationID       string                     `json:"invocation_id"`
	Author             string                     `json:"author"`
	Branch             string                     `json:"branch"`
	Partial            bool                       `json:"partial"`
	TurnComplete       bool                       `json:"turn_complete"`
	FinalResponse      bool                       `json:"final_response"`
	Text               string                     `json:"text,omitempty"`
	Thought            string                     `json:"thought,omitempty"`
	FunctionCalls      []normalizedFunctionCall   `json:"function_calls,omitempty"`
	FunctionResponses  []normalizedFunctionResult `json:"function_responses,omitempty"`
	StateDelta         map[string]any             `json:"state_delta,omitempty"`
	LongRunningToolIDs []string                   `json:"long_running_tool_ids,omitempty"`
}

type normalizedFunctionCall struct {
	ID   string         `json:"id,omitempty"`
	Name string         `json:"name"`
	Args map[string]any `json:"args,omitempty"`
}

type normalizedFunctionResult struct {
	ID       string         `json:"id,omitempty"`
	Name     string         `json:"name"`
	Response map[string]any `json:"response,omitempty"`
}

func emitNormalizedADKEvent(runID string, event *session.Event, emit func(StreamEvent) error) error {
	text, thought, functionCalls, functionResponses := extractEventParts(event.Content)
	return emit(NewEvent(runID, "session_event", normalizedSessionEvent{
		ID:                 event.ID,
		Timestamp:          event.Timestamp.UTC().Format(time.RFC3339Nano),
		InvocationID:       event.InvocationID,
		Author:             event.Author,
		Branch:             event.Branch,
		Partial:            event.Partial,
		TurnComplete:       event.TurnComplete,
		FinalResponse:      event.IsFinalResponse(),
		Text:               text,
		Thought:            thought,
		FunctionCalls:      functionCalls,
		FunctionResponses:  functionResponses,
		StateDelta:         event.Actions.StateDelta,
		LongRunningToolIDs: event.LongRunningToolIDs,
	}))
}

func extractEventParts(content *genai.Content) (string, string, []normalizedFunctionCall, []normalizedFunctionResult) {
	if content == nil {
		return "", "", nil, nil
	}

	var textParts []string
	var thoughtParts []string
	var functionCalls []normalizedFunctionCall
	var functionResponses []normalizedFunctionResult

	for _, part := range content.Parts {
		if part == nil {
			continue
		}
		switch {
		case strings.TrimSpace(part.Text) != "":
			if part.Thought {
				thoughtParts = append(thoughtParts, part.Text)
			} else {
				textParts = append(textParts, part.Text)
			}
		case part.FunctionCall != nil:
			functionCalls = append(functionCalls, normalizedFunctionCall{
				ID:   part.FunctionCall.ID,
				Name: part.FunctionCall.Name,
				Args: part.FunctionCall.Args,
			})
		case part.FunctionResponse != nil:
			functionResponses = append(functionResponses, normalizedFunctionResult{
				ID:       part.FunctionResponse.ID,
				Name:     part.FunctionResponse.Name,
				Response: part.FunctionResponse.Response,
			})
		}
	}

	return strings.TrimSpace(strings.Join(textParts, "\n")), strings.TrimSpace(strings.Join(thoughtParts, "\n")), functionCalls, functionResponses
}
