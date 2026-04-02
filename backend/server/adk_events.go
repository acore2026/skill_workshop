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

func normalizeADKEvent(event *session.Event) normalizedSessionEvent {
	text, thought, functionCalls, functionResponses := extractEventParts(event.Content)
	return normalizedSessionEvent{
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
		StateDelta:         sanitizeStateDelta(event.Actions.StateDelta),
		LongRunningToolIDs: event.LongRunningToolIDs,
	}
}

func sanitizeStateDelta(stateDelta map[string]any) map[string]any {
	if len(stateDelta) == 0 {
		return stateDelta
	}

	sanitized := make(map[string]any, len(stateDelta))
	for key, value := range stateDelta {
		switch key {
		case stateWriterMarkdownDraft, stateSkillMarkdown:
			if text, ok := value.(string); ok {
				sanitized[key] = extractMarkdownArtifact(text)
				continue
			}
		}
		sanitized[key] = value
	}
	return sanitized
}

func emitNormalizedADKEvent(runID string, event *session.Event, emit func(StreamEvent) error) error {
	return emit(NewEvent(runID, "session_event", normalizeADKEvent(event)))
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

	return joinEventText(textParts), joinEventText(thoughtParts), functionCalls, functionResponses
}

func joinEventText(parts []string) string {
	joined := strings.Join(parts, "")
	if strings.TrimSpace(joined) == "" {
		return ""
	}
	return joined
}

type partialEventCoalescer struct {
	runID            string
	emit             func(StreamEvent) error
	pending          *normalizedSessionEvent
	minChunkSize     int
	flushPunctuation string
}

func newPartialEventCoalescer(runID string, emit func(StreamEvent) error) *partialEventCoalescer {
	return &partialEventCoalescer{
		runID:            runID,
		emit:             emit,
		minChunkSize:     140,
		flushPunctuation: ".!?",
	}
}

func (c *partialEventCoalescer) push(event normalizedSessionEvent) error {
	if !c.isCoalescable(event) {
		if err := c.flush(); err != nil {
			return err
		}
		return c.emitEvent(event)
	}

	if c.pending == nil {
		next := event
		c.pending = &next
		if c.shouldFlush(*c.pending) {
			return c.flush()
		}
		return nil
	}

	if !c.isCompatible(*c.pending, event) {
		if err := c.flush(); err != nil {
			return err
		}
		next := event
		c.pending = &next
		if c.shouldFlush(*c.pending) {
			return c.flush()
		}
		return nil
	}

	c.pending.Text += event.Text
	c.pending.Thought += event.Thought
	c.pending.Timestamp = event.Timestamp
	c.pending.ID = event.ID
	if c.shouldFlush(*c.pending) {
		return c.flush()
	}
	return nil
}

func (c *partialEventCoalescer) flush() error {
	if c.pending == nil {
		return nil
	}
	event := *c.pending
	c.pending = nil
	return c.emitEvent(event)
}

func (c *partialEventCoalescer) emitEvent(event normalizedSessionEvent) error {
	return c.emit(NewEvent(c.runID, "session_event", event))
}

func (c *partialEventCoalescer) isCoalescable(event normalizedSessionEvent) bool {
	return event.Partial &&
		len(event.FunctionCalls) == 0 &&
		len(event.FunctionResponses) == 0 &&
		len(event.StateDelta) == 0 &&
		len(event.LongRunningToolIDs) == 0 &&
		(strings.TrimSpace(event.Text) != "" || strings.TrimSpace(event.Thought) != "")
}

func (c *partialEventCoalescer) isCompatible(current normalizedSessionEvent, next normalizedSessionEvent) bool {
	return current.Author == next.Author &&
		current.InvocationID == next.InvocationID &&
		current.Branch == next.Branch
}

func (c *partialEventCoalescer) shouldFlush(event normalizedSessionEvent) bool {
	text := event.Text
	if strings.TrimSpace(text) == "" {
		text = event.Thought
	}
	trimmed := strings.TrimRight(text, " ")
	if len(trimmed) >= c.minChunkSize {
		return true
	}
	if trimmed == "" {
		return false
	}
	if strings.Contains(trimmed, "\n\n") {
		return true
	}
	return strings.ContainsRune(c.flushPunctuation, rune(trimmed[len(trimmed)-1]))
}
