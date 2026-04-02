package server

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	markdownFrontMatterPattern = regexp.MustCompile(`(?s)^---\n.*?\n---\n`)
	workflowBlockPattern       = regexp.MustCompile("(?s)## Workflow[\\s\\S]*?```(?:python|py)\\s*(.*?)```")
	callPattern                = regexp.MustCompile(`CALL\s+(?:"([^"]+)"|([A-Za-z0-9_]+))`)
	outputFormatToolPattern    = regexp.MustCompile(`(?m)^([A-Za-z0-9_]+)(?:\(|\s*$)`)
)

func validateMarkdownSkill(markdown string, catalog normalizedToolCatalog) []string {
	trimmed := strings.TrimSpace(markdown)
	var issues []string

	if trimmed == "" {
		return []string{"markdown output is empty"}
	}
	if !markdownFrontMatterPattern.MatchString(trimmed) {
		issues = append(issues, "markdown front matter is required")
	}

	requiredSections := []string{
		"# ",
		"## Overview",
		"## Tool Inventory",
		"## Workflow",
		"## Critical Rules",
		"## Output Format",
	}
	lastIndex := -1
	for _, section := range requiredSections {
		index := strings.Index(trimmed, section)
		if index < 0 {
			issues = append(issues, fmt.Sprintf("required markdown section missing: %s", section))
			continue
		}
		if lastIndex >= 0 && index < lastIndex {
			issues = append(issues, "markdown sections are out of order")
		}
		lastIndex = index
	}

	workflowMatch := workflowBlockPattern.FindStringSubmatch(trimmed)
	if len(workflowMatch) < 2 {
		issues = append(issues, "workflow section must contain a fenced python block")
	} else {
		workflowBody := workflowMatch[1]
		workflowCalls := extractWorkflowCallNames(workflowBody)
		if len(workflowCalls) == 0 {
			issues = append(issues, "workflow block must contain at least one CALL step")
		}
		for _, toolName := range workflowCalls {
			if _, ok := catalog.ByName[toolName]; !ok {
				issues = append(issues, fmt.Sprintf("workflow references unknown tool %q", toolName))
			}
		}
		if strings.Contains(workflowBody, "IF ") || strings.Contains(workflowBody, "ELSE:") || strings.Contains(workflowBody, `OUTPUT "ABORT"`) {
			issues = append(issues, "workflow must be linear and must not include IF, ELSE, or ABORT branches")
		}
		if !strings.Contains(workflowBody, `OUTPUT "DONE"`) {
			issues = append(issues, `workflow must include OUTPUT "DONE"`)
		}
	}

	for _, toolName := range extractMarkdownToolNames(trimmed) {
		if _, ok := catalog.ByName[toolName]; !ok {
			issues = append(issues, fmt.Sprintf("markdown references unknown tool %q", toolName))
		}
	}

	return dedupeIssues(append(issues, validateWorkflowProcess(trimmed, catalog)...))
}

func extractMarkdownToolNames(markdown string) []string {
	inventoryPattern := regexp.MustCompile("(?m)^-\\s+`([^`]+)`")
	inventoryMatches := inventoryPattern.FindAllStringSubmatch(markdown, -1)
	outputFormatMatches := outputFormatToolPattern.FindAllStringSubmatch(markdown, -1)
	workflowCalls := extractWorkflowCallNames(markdown)
	names := make([]string, 0, len(workflowCalls)+len(inventoryMatches)+len(outputFormatMatches))
	for _, match := range inventoryMatches {
		name := strings.TrimSpace(match[1])
		if name != "" {
			names = append(names, name)
		}
	}
	for _, name := range workflowCalls {
		if name != "" {
			names = append(names, name)
		}
	}
	for _, match := range outputFormatMatches {
		name := strings.TrimSpace(match[1])
		if name != "" && !strings.EqualFold(name, "DONE") {
			names = append(names, name)
		}
	}
	return names
}

func extractWorkflowCallNames(text string) []string {
	matches := callPattern.FindAllStringSubmatch(text, -1)
	names := make([]string, 0, len(matches))
	for _, match := range matches {
		name := strings.TrimSpace(match[1])
		if name == "" {
			name = strings.TrimSpace(match[2])
		}
		if name != "" {
			names = append(names, name)
		}
	}
	return names
}

func validateWorkflowProcess(markdown string, catalog normalizedToolCatalog) []string {
	var issues []string

	workflowMatch := workflowBlockPattern.FindStringSubmatch(markdown)
	if len(workflowMatch) < 2 {
		return nil
	}
	workflowBody := workflowMatch[1]
	workflowCalls := extractWorkflowCallNames(workflowBody)
	inventoryNames := extractInventoryToolNames(markdown)
	outputNames := extractOutputFormatToolNames(markdown)

	if len(inventoryNames) > 0 {
		for _, toolName := range inventoryNames {
			if !containsString(workflowCalls, toolName) {
				issues = append(issues, fmt.Sprintf("tool inventory includes %q but workflow does not call it", toolName))
			}
		}
		for _, toolName := range workflowCalls {
			if !containsString(inventoryNames, toolName) {
				issues = append(issues, fmt.Sprintf("workflow calls %q but tool inventory does not list it", toolName))
			}
		}
	}

	if len(outputNames) > 0 {
		for _, toolName := range workflowCalls {
			if !containsString(outputNames, toolName) {
				issues = append(issues, fmt.Sprintf("workflow calls %q but output format does not include it", toolName))
			}
		}
	}

	return issues
}

func extractInventoryToolNames(markdown string) []string {
	inventoryPattern := regexp.MustCompile("(?m)^-\\s+`([^`]+)`")
	matches := inventoryPattern.FindAllStringSubmatch(markdown, -1)
	names := make([]string, 0, len(matches))
	for _, match := range matches {
		name := strings.TrimSpace(match[1])
		if name != "" && !strings.EqualFold(name, "DONE") {
			names = append(names, name)
		}
	}
	return names
}

func extractOutputFormatToolNames(markdown string) []string {
	matches := outputFormatToolPattern.FindAllStringSubmatch(markdown, -1)
	names := make([]string, 0, len(matches))
	for _, match := range matches {
		name := strings.TrimSpace(match[1])
		if name != "" {
			names = append(names, name)
		}
	}
	return names
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func dedupeIssues(issues []string) []string {
	if len(issues) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	deduped := make([]string, 0, len(issues))
	for _, issue := range issues {
		issue = strings.TrimSpace(issue)
		if issue == "" {
			continue
		}
		if _, ok := seen[issue]; ok {
			continue
		}
		seen[issue] = struct{}{}
		deduped = append(deduped, issue)
	}
	return deduped
}

func formatMarkdownIssues(issues []string) string {
	if len(issues) == 0 {
		return "No validation issues were found. Return the markdown unchanged if it is already valid."
	}
	return "- " + strings.Join(issues, "\n- ")
}
