package server

import (
	"strings"
	"testing"
)

func TestExtractMarkdownArtifact(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "plain markdown",
			input: "---\nname: ACN\ndescription: demo\n---\n# ACN Skill",
			want:  "---\nname: ACN\ndescription: demo\n---\n# ACN Skill",
		},
		{
			name:  "markdown fenced document",
			input: "```markdown\n---\nname: ACN\ndescription: demo\n---\n# ACN Skill\n```",
			want:  "---\nname: ACN\ndescription: demo\n---\n# ACN Skill",
		},
		{
			name:  "yaml fenced document",
			input: "```yaml\n---\nname: ACN\ndescription: demo\n---\n# ACN Skill\n```",
			want:  "---\nname: ACN\ndescription: demo\n---\n# ACN Skill",
		},
	}

	for _, tt := range tests {
		if got := extractMarkdownArtifact(tt.input); got != tt.want {
			t.Fatalf("%s: extractMarkdownArtifact() = %q, want %q", tt.name, got, tt.want)
		}
	}
}

func TestBuildInitialStateIncludesCompactToolShortlist(t *testing.T) {
	catalog := normalizedToolCatalog{
		Tools: []normalizedTool{
			{Name: "Subscription_tool", Description: "Checks subscription access."},
			{Name: "Create_Or_Update_Subnet_Context_tool", Description: "Prepares subnet context."},
			{Name: "Issue_Access_Token_tool", Description: "Issues the access token."},
			{Name: "Validate_Access_Token_tool", Description: "Validates the access token."},
			{Name: "Create_Subnet_PDUSession_tool", Description: "Creates the subnet PDU session."},
		},
		ByName: map[string]normalizedTool{
			"Subscription_tool":                    {Name: "Subscription_tool", Description: "Checks subscription access."},
			"Create_Or_Update_Subnet_Context_tool": {Name: "Create_Or_Update_Subnet_Context_tool", Description: "Prepares subnet context."},
			"Issue_Access_Token_tool":              {Name: "Issue_Access_Token_tool", Description: "Issues the access token."},
			"Validate_Access_Token_tool":           {Name: "Validate_Access_Token_tool", Description: "Validates the access token."},
			"Create_Subnet_PDUSession_tool":        {Name: "Create_Subnet_PDUSession_tool", Description: "Creates the subnet PDU session."},
		},
	}

	state := buildInitialState(StartRunRequest{
		Messages: []ChatMessage{
			{Role: "user", Content: "Connect a new embodied agent to the network subnet"},
		},
		CurrentSkillMarkdown: "---\nname: old\ndescription: old\n---",
	}, catalog)

	shortlist, ok := state[stateToolShortlist].(string)
	if !ok || shortlist == "" {
		t.Fatalf("expected tool shortlist in initial state, got %#v", state[stateToolShortlist])
	}
	if shortlist == state[stateToolCatalogJSON] {
		t.Fatalf("expected shortlist to differ from full catalog summary")
	}
	if !containsAll(shortlist,
		"Subscription_tool",
		"Create_Or_Update_Subnet_Context_tool",
		"Issue_Access_Token_tool",
	) {
		t.Fatalf("expected ACN shortlist tools, got %q", shortlist)
	}
}

func TestIntentAnalysisInstructionStreamsDirectly(t *testing.T) {
	instruction := buildIntentAnalysisInstruction(map[string]any{
		stateNormalizedPrompt: "Connect embodied agents to a subnet",
		stateIntentCategory:   string(intentCategoryACN),
		stateKnowledgeBrief:   "Domain: ACN",
		stateToolShortlist:    "- Subscription_tool: Checks subscription access.",
	})
	if !strings.Contains(instruction, "Start writing the summary immediately. Stream the lines directly as you compose them.") {
		t.Fatalf("expected stream-friendly instruction, got %q", instruction)
	}
}

func containsAll(text string, fragments ...string) bool {
	for _, fragment := range fragments {
		if !strings.Contains(text, fragment) {
			return false
		}
	}
	return true
}
