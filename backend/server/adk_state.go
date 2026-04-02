package server

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

const (
	stateConversationTranscript = "conversation_transcript"
	stateCurrentSkillMarkdown   = "current_skill_markdown"
	stateLatestUserRequest      = "latest_user_request"
	stateNormalizedPrompt       = "normalized_prompt"
	stateToolCatalogJSON        = "tool_catalog_json"
	stateToolShortlist          = "tool_shortlist"
	stateIntentCategory         = "intent_category"
	stateIntentAnalysisSummary  = "intent_analysis_summary"
	stateWriterMarkdownDraft    = "writer_markdown_draft"
	stateCheckerIssues          = "checker_issues"
	stateCheckerAttemptCount    = "checker_attempt_count"
	stateSkillMarkdown          = "skill_markdown"
)

func buildInitialState(req StartRunRequest, catalog normalizedToolCatalog) map[string]any {
	currentMarkdown := strings.TrimSpace(req.CurrentSkillMarkdown)
	if currentMarkdown == "" {
		currentMarkdown = strings.TrimSpace(req.CurrentSkillYAML)
	}
	userPrompt := latestUserPrompt(req.Messages)
	category, knowledge := resolveKnowledgeCase(userPrompt)

	return map[string]any{
		stateConversationTranscript: formatMessages(req.Messages),
		stateCurrentSkillMarkdown:   currentMarkdown,
		stateLatestUserRequest:      userPrompt,
		stateNormalizedPrompt:       normalizePrompt(userPrompt),
		stateToolCatalogJSON:        formatToolCatalogForPrompt(catalog),
		stateToolShortlist:          formatToolShortlistForPrompt(category, knowledge, catalog),
		stateIntentCategory:         string(category),
		stateKnowledgeCase:          knowledgeCaseID(knowledge),
		stateKnowledgeBrief:         formatKnowledgeBrief(knowledge),
		stateCheckerAttemptCount:    0,
	}
}

func collectStateValues(state session.ReadonlyState) map[string]any {
	values := map[string]any{}
	for key, value := range state.All() {
		values[key] = value
	}
	return values
}

func intentAnalysisInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	stateValues := collectStateValues(ctx.ReadonlyState())
	return buildIntentAnalysisInstruction(stateValues), nil
}

func buildIntentAnalysisInstruction(stateValues map[string]any) string {
	return fmt.Sprintf(
		"You are the Intent Analysis agent for a markdown skill generator.\n\nWrite one very short user-facing analysis summary before skill drafting begins.\n\nRules:\n- Output concise prose only.\n- Do not output YAML or markdown skill content.\n- Do not narrate tool-by-tool in detail.\n- Do not repeat the request.\n- Start writing the summary immediately. Stream the lines directly as you compose them.\n- Stop after exactly 3 short lines.\n- Each line must be under 14 words.\n\nOutput format:\nCategory: <fixed category>\nGoal: <one sentence>\nWorkflow: <one sentence>\n\nNormalized prompt:\n%s\n\nFixed intent category:\n%s\n\nMatched domain knowledge:\n%s\n\nLikely tool shortlist:\n%s",
		formatStateString(stateValues[stateNormalizedPrompt], "No prompt provided."),
		formatStateString(stateValues[stateIntentCategory], string(intentCategoryACN)),
		formatStateString(stateValues[stateKnowledgeBrief], "No domain reference matched the current request."),
		formatStateString(stateValues[stateToolShortlist], "No tools available."),
	)
}

func writerInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	stateValues := collectStateValues(ctx.ReadonlyState())
	return fmt.Sprintf(
		"You are the Skill Writer for a markdown skill generator.\n\nWrite the final markdown skill document directly.\n\nRules:\n- Output markdown only.\n- The response itself must be the markdown document.\n- Do not wrap the full document in ``` fences, ```yaml fences, ```markdown fences, or any surrounding code block.\n- The document must begin immediately with the YAML front matter line `---`.\n- Follow the structure and tone of doc/md/ACN_SKILL.md, but adapt content to the actual request and category.\n- Use only tool names from the provided tool catalog.\n- Do not output YAML IR.\n- Do not invent parameter wiring, parameter placeholders, or parameter values.\n- Prefer the shortest valid workflow that matches the intent and domain guidance.\n- For now, keep the workflow strictly linear: no IF, no ELSE, no ABORT branch.\n- End the workflow with OUTPUT \"DONE\".\n\nThe markdown document must use this exact section order:\n1. YAML front matter\n2. H1 title\n3. ## Overview\n4. ## Tool Inventory\n5. ## Workflow\n6. ## Critical Rules\n7. ## Output Format\n\nFormatting rules:\n- Front matter must contain name and description.\n- Title must be exactly '# {name} Skill'.\n- Tool Inventory must list only the selected tools.\n- Workflow must be a fenced python pseudo-code block that uses only ordered CALL \"ToolName\" lines followed by OUTPUT \"DONE\".\n- Critical Rules must be concise and operational.\n- Output Format must list the same ordered tool names on separate lines followed by DONE.\n\nIntent category:\n%s\n\nIntent analysis summary:\n%s\n\nMatched domain knowledge:\n%s\n\nCurrent markdown skill:\n%s\n\nTool catalog summary:\n%s",
		formatStateString(stateValues[stateIntentCategory], string(intentCategoryACN)),
		formatStateString(stateValues[stateIntentAnalysisSummary], "No prior analysis summary available."),
		formatStateString(stateValues[stateKnowledgeBrief], "No domain reference matched the current request."),
		formatCurrentMarkdown(formatStateString(stateValues[stateCurrentSkillMarkdown], "")),
		formatStateString(stateValues[stateToolCatalogJSON], "No tools available."),
	), nil
}

func checkerInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	stateValues := collectStateValues(ctx.ReadonlyState())
	return fmt.Sprintf(
		"You are the Markdown Format Checker for a markdown skill generator.\n\nValidate the current markdown draft and return a corrected markdown document.\n\nRules:\n- Output markdown only.\n- The response itself must be the markdown document.\n- Do not wrap the full document in ``` fences, ```yaml fences, ```markdown fences, or any surrounding code block.\n- The document must begin immediately with the YAML front matter line `---`.\n- If the draft is already valid, return it unchanged.\n- Preserve intent and tool sequence.\n- Fix structure, formatting, tool grounding, and workflow consistency.\n- Do not emit YAML IR, explanations, or extra prose outside the markdown document.\n- Keep the workflow strictly linear: no IF, no ELSE, no ABORT branch.\n\nRequired markdown structure:\n1. YAML front matter\n2. H1 title\n3. ## Overview\n4. ## Tool Inventory\n5. ## Workflow\n6. ## Critical Rules\n7. ## Output Format\n\nFormatting rules:\n- Workflow must be a fenced python pseudo-code block.\n- Use only tools from the catalog.\n- Workflow lines must be ordered CALL \"ToolName\" entries followed by OUTPUT \"DONE\".\n- Output Format must list the same ordered tool names followed by DONE.\n\nIntent category:\n%s\n\nMatched domain knowledge:\n%s\n\nValidation issues to fix:\n%s\n\nCurrent markdown draft:\n%s\n\nTool catalog summary:\n%s",
		formatStateString(stateValues[stateIntentCategory], string(intentCategoryACN)),
		formatStateString(stateValues[stateKnowledgeBrief], "No domain reference matched the current request."),
		formatStateString(stateValues[stateCheckerIssues], "No issues provided. Return the markdown unchanged if it is valid."),
		formatCurrentMarkdown(formatStateString(stateValues[stateWriterMarkdownDraft], "")),
		formatStateString(stateValues[stateToolCatalogJSON], "No tools available."),
	), nil
}

func knowledgeCaseID(knowledge *knowledgeCase) string {
	if knowledge == nil {
		return ""
	}
	return knowledge.ID
}

func formatToolCatalogForPrompt(catalog normalizedToolCatalog) string {
	if len(catalog.Tools) == 0 {
		return "No tools available."
	}

	lines := make([]string, 0, len(catalog.Tools))
	for _, tool := range catalog.Tools {
		required := "none"
		if len(tool.RequiredParams) > 0 {
			required = strings.Join(tool.RequiredParams, ", ")
		}
		lines = append(lines, fmt.Sprintf("- %s: %s | required params: %s", tool.Name, tool.Description, required))
	}
	return strings.Join(lines, "\n")
}

func formatToolShortlistForPrompt(category intentCategory, knowledge *knowledgeCase, catalog normalizedToolCatalog) string {
	if len(catalog.Tools) == 0 {
		return "No tools available."
	}

	seen := map[string]struct{}{}
	shortlist := make([]string, 0, 5)
	appendTool := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		tool, ok := catalog.ByName[name]
		if !ok {
			return
		}
		if _, exists := seen[tool.Name]; exists {
			return
		}
		seen[tool.Name] = struct{}{}
		shortlist = append(shortlist, fmt.Sprintf("- %s: %s", tool.Name, tool.Description))
	}

	if category == intentCategoryACN && knowledge != nil {
		for _, toolName := range []string{
			"Subscription_tool",
			"Create_Or_Update_Subnet_Context_tool",
			"Issue_Access_Token_tool",
			"Validate_Access_Token_tool",
			"Create_Subnet_PDUSession_tool",
		} {
			appendTool(toolName)
		}
	}

	if len(shortlist) == 0 {
		for _, tool := range catalog.Tools {
			appendTool(tool.Name)
			if len(shortlist) >= 5 {
				break
			}
		}
	}

	if len(shortlist) == 0 {
		return "No tools available."
	}
	return strings.Join(shortlist, "\n")
}

func latestUserPrompt(messages []ChatMessage) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if strings.EqualFold(strings.TrimSpace(messages[i].Role), "user") && strings.TrimSpace(messages[i].Content) != "" {
			return strings.TrimSpace(messages[i].Content)
		}
	}
	return "Help update the current skill."
}

func normalizePrompt(prompt string) string {
	normalized := strings.TrimSpace(prompt)
	normalized = strings.Join(strings.Fields(normalized), " ")
	return normalized
}

func formatMessages(messages []ChatMessage) string {
	if len(messages) == 0 {
		return "No prior messages."
	}

	start := 0
	if len(messages) > 12 {
		start = len(messages) - 12
	}

	lines := make([]string, 0, len(messages)-start)
	for _, message := range messages[start:] {
		role := strings.TrimSpace(message.Role)
		if role == "" {
			role = "user"
		}
		lines = append(lines, fmt.Sprintf("[%s]\n%s", role, strings.TrimSpace(message.Content)))
	}
	return strings.Join(lines, "\n\n")
}

func formatCurrentMarkdown(markdownText string) string {
	if strings.TrimSpace(markdownText) == "" {
		return "No current markdown skill document exists yet."
	}
	return markdownText
}

func formatStateString(value any, fallback string) string {
	if text, ok := value.(string); ok && strings.TrimSpace(text) != "" {
		return strings.TrimSpace(text)
	}
	return fallback
}

func contentText(content *genai.Content) string {
	if content == nil {
		return ""
	}

	var parts []string
	for _, part := range content.Parts {
		if part == nil || strings.TrimSpace(part.Text) == "" {
			continue
		}
		parts = append(parts, part.Text)
	}
	return strings.TrimSpace(strings.Join(parts, "\n"))
}

func mustJSONString(value any) string {
	bytes, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return "{}"
	}
	return string(bytes)
}

func extractMarkdownArtifact(text string) string {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return ""
	}

	for _, pattern := range []string{
		"(?s)^```(?:markdown|md|yaml)?\\s*(---\\n[\\s\\S]*?)\\s*```$",
		"(?s)^```\\s*(---\\n[\\s\\S]*?)\\s*```$",
	} {
		re := regexp.MustCompile(pattern)
		if match := re.FindStringSubmatch(trimmed); len(match) > 1 {
			return strings.TrimSpace(match[1])
		}
	}

	return trimmed
}
