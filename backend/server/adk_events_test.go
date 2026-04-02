package server

import (
	"testing"
	"time"

	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

func TestSanitizeStateDeltaUnwrapsMarkdownArtifacts(t *testing.T) {
	stateDelta := map[string]any{
		stateWriterMarkdownDraft: "```yaml\n---\nname: ACN\ndescription: demo\n---\n# ACN Skill\n```",
		stateSkillMarkdown:       "```markdown\n---\nname: Final\ndescription: done\n---\n# Final Skill\n```",
		"unchanged":              "value",
	}

	got := sanitizeStateDelta(stateDelta)

	if got[stateWriterMarkdownDraft] != "---\nname: ACN\ndescription: demo\n---\n# ACN Skill" {
		t.Fatalf("writer draft was not sanitized: %q", got[stateWriterMarkdownDraft])
	}
	if got[stateSkillMarkdown] != "---\nname: Final\ndescription: done\n---\n# Final Skill" {
		t.Fatalf("skill markdown was not sanitized: %q", got[stateSkillMarkdown])
	}
	if got["unchanged"] != "value" {
		t.Fatalf("unexpected mutation of unrelated state delta: %v", got["unchanged"])
	}
}

func TestNormalizeADKEventKeepsAnalysisThoughtSeparate(t *testing.T) {
	event := &session.Event{
		ID:           "evt-1",
		Timestamp:    time.Now(),
		InvocationID: "inv-1",
		Author:       "intent_analysis_agent",
		LLMResponse:  session.Event{}.LLMResponse,
	}
	event.Content = &genai.Content{
		Role: genai.RoleModel,
		Parts: []*genai.Part{
			{Text: "Category: ACN\nGoal: Connect agents.\nWorkflow: Validate then connect.", Thought: true},
		},
	}

	normalized := normalizeADKEvent(event)
	if normalized.Text != "" {
		t.Fatalf("expected no visible analysis text promotion, got %q", normalized.Text)
	}
	if normalized.Thought == "" {
		t.Fatal("expected analysis thought to remain available")
	}
}
