package server

import (
	"strings"
	"testing"
)

func mustLoadCatalog(t *testing.T) normalizedToolCatalog {
	t.Helper()
	catalog, err := loadNormalizedToolCatalog()
	if err != nil {
		t.Fatalf("loadNormalizedToolCatalog: %v", err)
	}
	return catalog
}

func TestDetectIntentCategory(t *testing.T) {
	tests := []struct {
		name   string
		prompt string
		want   intentCategory
	}{
		{
			name:   "acn",
			prompt: "Connect a new embodied agent to the network subnet",
			want:   intentCategoryACN,
		},
		{
			name:   "qos",
			prompt: "Enable QoS and bandwidth priority for cloud gaming",
			want:   intentCategoryQoS,
		},
		{
			name:   "computation",
			prompt: "Offload this workload to the best compute resource",
			want:   intentCategoryComputation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := detectIntentCategory(tt.prompt); got != tt.want {
				t.Fatalf("detectIntentCategory(%q) = %q, want %q", tt.prompt, got, tt.want)
			}
		})
	}
}

func TestValidateMarkdownSkillAcceptsWellFormedMarkdown(t *testing.T) {
	catalog := mustLoadCatalog(t)
	markdown := strings.TrimSpace(strings.Join([]string{
		"---",
		"name: ACN",
		"description: Process of connecting embodied agents to the network.",
		"---",
		"# ACN Skill",
		"",
		"## Overview",
		"",
		"Connect a new embodied agent to the target network subnet.",
		"",
		"## Tool Inventory",
		"",
		"- `Subscription_tool` — Confirm the requester is eligible.",
		"- `Create_Or_Update_Subnet_Context_tool` — Prepare the subnet context.",
		"- `Issue_Access_Token_tool` — Issue a token for access.",
		"- `Validate_Access_Token_tool` — Validate the issued token.",
		"- `Create_Subnet_PDUSession_tool` — Establish the subnet session.",
		"",
		"## Workflow",
		"",
		"```python",
		`CALL "Subscription_tool"`,
		`    CALL "Create_Or_Update_Subnet_Context_tool"`,
		`    CALL "Issue_Access_Token_tool"`,
		`    CALL "Validate_Access_Token_tool"`,
		`        CALL "Create_Subnet_PDUSession_tool"`,
		`        OUTPUT "DONE"`,
		"```",
		"",
		"## Critical Rules",
		"",
		"- Do not skip any step.",
		"- Keep shared identifiers consistent across the flow.",
		"",
		"## Output Format",
		"",
		"```",
		`Subscription_tool`,
		`Create_Or_Update_Subnet_Context_tool`,
		`Issue_Access_Token_tool`,
		`Validate_Access_Token_tool`,
		`Create_Subnet_PDUSession_tool`,
		"DONE",
		"```",
	}, "\n"))

	if issues := validateMarkdownSkill(markdown, catalog); len(issues) > 0 {
		t.Fatalf("validateMarkdownSkill returned issues: %v", issues)
	}
}

func TestValidateMarkdownSkillRejectsUnknownToolsAndMissingSections(t *testing.T) {
	catalog := mustLoadCatalog(t)
	markdown := strings.TrimSpace(strings.Join([]string{
		"---",
		"name: Bad",
		"description: Bad markdown.",
		"---",
		"# Bad Skill",
		"",
		"## Tool Inventory",
		"",
		"- `Nonexistent_tool` — Unknown tool.",
		"",
		"## Workflow",
		"",
		"```python",
		`CALL "Nonexistent_tool"`,
		"```",
		"",
		"## Output Format",
		"",
		"```",
		"DONE",
		"```",
	}, "\n"))

	issues := validateMarkdownSkill(markdown, catalog)
	if len(issues) == 0 {
		t.Fatal("expected validation issues, got none")
	}

	joined := strings.Join(issues, " | ")
	for _, expected := range []string{
		"required markdown section missing: ## Overview",
		"required markdown section missing: ## Critical Rules",
		"workflow references unknown tool \"Nonexistent_tool\"",
		"workflow must include OUTPUT \"DONE\"",
	} {
		if !strings.Contains(joined, expected) {
			t.Fatalf("expected issue %q in %q", expected, joined)
		}
	}
}

func TestValidateWorkflowProcessRejectsInventoryMismatch(t *testing.T) {
	catalog := mustLoadCatalog(t)
	markdown := strings.TrimSpace(strings.Join([]string{
		"---",
		"name: ACN",
		"description: Process of connecting embodied agents to the network.",
		"---",
		"# ACN Skill",
		"",
		"## Overview",
		"",
		"Bad workflow ordering example.",
		"",
		"## Tool Inventory",
		"",
		"- `Issue_Access_Token_tool` — Issue a token for access.",
		"",
		"## Workflow",
		"",
		"```python",
		`CALL Validate_Access_Token_tool`,
		`CALL Issue_Access_Token_tool`,
		`OUTPUT "DONE"`,
		"```",
		"",
		"## Critical Rules",
		"",
		"- Preserve order.",
		"",
		"## Output Format",
		"",
		"```",
		`Issue_Access_Token_tool`,
		"DONE",
		"```",
	}, "\n"))

	issues := validateWorkflowProcess(markdown, catalog)
	joined := strings.Join(issues, " | ")
	if !strings.Contains(joined, "workflow calls \"Validate_Access_Token_tool\" but tool inventory does not list it") {
		t.Fatalf("expected workflow/inventory mismatch issue, got %q", joined)
	}
	if !strings.Contains(joined, "workflow calls \"Validate_Access_Token_tool\" but output format does not include it") {
		t.Fatalf("expected output-format mismatch issue, got %q", joined)
	}
}

func TestFormatMarkdownIssues(t *testing.T) {
	if got := formatMarkdownIssues(nil); !strings.Contains(got, "Return the markdown unchanged") {
		t.Fatalf("unexpected empty issue formatting: %q", got)
	}

	got := formatMarkdownIssues([]string{"first issue", "second issue"})
	if !strings.Contains(got, "- first issue") || !strings.Contains(got, "- second issue") {
		t.Fatalf("unexpected formatted issues: %q", got)
	}
}
