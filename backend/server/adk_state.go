package server

import (
	"fmt"
	"regexp"
	"strings"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

var yamlBlockPattern = regexp.MustCompile("(?s)```yaml\\s*(.*?)```")

const (
	stateConversationTranscript = "conversation_transcript"
	stateCurrentSkillYAML       = "current_skill_yaml"
	stateLatestUserRequest      = "latest_user_request"
	stateAnalysisSummary        = "analysis_summary"
	statePackageReady           = "package_ready"
	statePackageSummary         = "package_summary"
	stateSkillYAMLDraft         = "skill_yaml_draft"
	statePackageName            = "package_name"
)

func buildInitialState(req StartRunRequest) map[string]any {
	return map[string]any{
		stateConversationTranscript: formatMessages(req.Messages),
		stateCurrentSkillYAML:       strings.TrimSpace(req.CurrentSkillYAML),
		stateLatestUserRequest:      latestUserPrompt(req.Messages),
		statePackageName:            "6gcore_skill_creater",
	}
}

func collectStateValues(state session.ReadonlyState) map[string]any {
	values := map[string]any{}
	for key, value := range state.All() {
		values[key] = value
	}
	return values
}

func analysisInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	stateValues := collectStateValues(ctx.ReadonlyState())
	return fmt.Sprintf(
		"Conversation transcript:\n%s\n\nCurrent YAML skill:\n%s\n\nYou are the Skill Workshop analysis agent.\nExplain what the user is trying to build, which SBI steps or data containers are implicated, and what will change in the skill graph.\nReturn only concise operator-facing analysis text. Do not emit YAML.",
		formatStateString(stateValues[stateConversationTranscript], "No prior messages."),
		formatCurrentYAML(formatStateString(stateValues[stateCurrentSkillYAML], "")),
	), nil
}

func packageInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	stateValues := collectStateValues(ctx.ReadonlyState())
	return fmt.Sprintf(
		"You are the package preparation agent.\nCall install_skill_package exactly once with name %q and version \"latest\".\nAfter the tool succeeds, respond with one concise sentence confirming the package is ready.",
		formatStateString(stateValues[statePackageName], "6gcore_skill_creater"),
	), nil
}

func draftInstructionProvider(ctx agent.ReadonlyContext) (string, error) {
	stateValues := collectStateValues(ctx.ReadonlyState())
	return fmt.Sprintf(
		"Conversation transcript:\n%s\n\nPrior analysis:\n%s\n\nCurrent YAML skill:\n%s\n\nPackage summary:\n%s\n\nYou are the Skill Workshop draft writer.\nGenerate a complete YAML skill document that matches this product's frontend contract.\nRules:\n- Top-level keys: metadata, cards, links.\n- Valid card types: action, branch, loop, parallel, success, failure, constant, user_container, device_container, network_container, app_container.\n- Data container cards and constant cards use attributes and do not include nextActions.\n- success and failure cards do not expose inputs or outputs.\n- Link types are data and next_action.\n- Link port names must match card port names or nextAction labels exactly.\nReturn a short explanation followed by exactly one fenced yaml block with the full document.",
		formatStateString(stateValues[stateConversationTranscript], "No prior messages."),
		formatStateString(stateValues[stateAnalysisSummary], "No prior analysis."),
		formatCurrentYAML(formatStateString(stateValues[stateCurrentSkillYAML], "")),
		formatStateString(stateValues[statePackageSummary], "Package not prepared yet."),
	), nil
}

func latestUserPrompt(messages []ChatMessage) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if strings.EqualFold(strings.TrimSpace(messages[i].Role), "user") && strings.TrimSpace(messages[i].Content) != "" {
			return strings.TrimSpace(messages[i].Content)
		}
	}
	return "Help update the current skill."
}

func extractYAMLArtifact(text string) (yamlText string, narrative string) {
	matches := yamlBlockPattern.FindStringSubmatch(text)
	if len(matches) < 2 {
		return "", strings.TrimSpace(text)
	}

	yamlText = strings.TrimSpace(matches[1])
	narrative = strings.TrimSpace(yamlBlockPattern.ReplaceAllString(text, ""))
	return yamlText, narrative
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

func formatCurrentYAML(yamlText string) string {
	if strings.TrimSpace(yamlText) == "" {
		return "No current YAML skill document exists yet."
	}
	return yamlText
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
