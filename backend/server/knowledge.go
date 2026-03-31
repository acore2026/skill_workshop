package server

import (
	"fmt"
	"strings"
)

const (
	stateKnowledgeCase  = "knowledge_case"
	stateKnowledgeBrief = "knowledge_brief"
)

type intentCategory string

const (
	intentCategoryACN         intentCategory = "ACN"
	intentCategoryQoS         intentCategory = "QoS"
	intentCategoryComputation intentCategory = "Computation"
)

type knowledgeCase struct {
	ID               string
	Category         intentCategory
	MatchAll         []string
	Name             string
	Description      string
	Overview         string
	StepTitles       map[string]string
	ToolHints        []string
	FailureLabel     string
	SuccessLabel     string
	ContinuityRules  []string
	CriticalRules    []string
	SuccessCondition string
}

var acnKnowledgeCase = knowledgeCase{
	ID:          "acn_embodied_agent_subnet",
	Category:    intentCategoryACN,
	MatchAll:    []string{"embodied agent", "network subnet"},
	Name:        "ACN",
	Description: "Process of connecting embodied agents to the network.",
	Overview:    "Connect embodied agents to a dedicated network subnet through a short, ordered tool workflow.",
	ToolHints: []string{
		"Start by checking subscription eligibility.",
		"Set up the subnet context before issuing access credentials.",
		"Issue and then validate access credentials before session creation.",
		"Finish by creating the subnet PDU session.",
	},
	StepTitles: map[string]string{
		"Subscription_tool":                    "Subscription Status Check",
		"Create_Or_Update_Subnet_Context_tool": "Create/Update Subnet Context",
		"Issue_Access_Token_tool":              "Issue Access Token",
		"Validate_Access_Token_tool":           "Token Validation",
		"Create_Subnet_PDUSession_tool":        "Establish PDU Session",
	},
	FailureLabel:     "ABORT",
	SuccessLabel:     "DONE",
	SuccessCondition: "The embodied agent is successfully connected to the target network subnet.",
	ContinuityRules: []string{
		"Keep the workflow linear and ordered.",
		"Use only the tools needed for subnet connection.",
	},
	CriticalRules: []string{
		"Do not skip any step.",
		"Keep the workflow concise and operational.",
	},
}

var qosKnowledgeCase = knowledgeCase{
	ID:           "qos_generic",
	Category:     intentCategoryQoS,
	Name:         "QoS",
	Description:  "Quality-of-service workflow requests such as bandwidth, latency, or priority handling.",
	Overview:     "",
	FailureLabel: "ABORT",
	SuccessLabel: "DONE",
}

var computationKnowledgeCase = knowledgeCase{
	ID:           "computation_generic",
	Category:     intentCategoryComputation,
	Name:         "Computation",
	Description:  "Computation workflow requests such as offloading, placement, or resource selection.",
	Overview:     "",
	FailureLabel: "ABORT",
	SuccessLabel: "DONE",
}

func detectIntentCategory(prompt string) intentCategory {
	normalized := strings.ToLower(strings.TrimSpace(prompt))
	if normalized == "" {
		return intentCategoryACN
	}

	isACN := true
	for _, fragment := range acnKnowledgeCase.MatchAll {
		if !strings.Contains(normalized, fragment) {
			isACN = false
			break
		}
	}
	if isACN {
		return intentCategoryACN
	}

	qosKeywords := []string{"qos", "latency", "bandwidth", "throughput", "priority", "turbo mode", "gaming"}
	for _, keyword := range qosKeywords {
		if strings.Contains(normalized, keyword) {
			return intentCategoryQoS
		}
	}

	computationKeywords := []string{"compute", "computation", "offload", "placement", "gpu", "cpu", "workload", "resource"}
	for _, keyword := range computationKeywords {
		if strings.Contains(normalized, keyword) {
			return intentCategoryComputation
		}
	}

	return intentCategoryACN
}

func resolveKnowledgeCase(prompt string) (intentCategory, *knowledgeCase) {
	category := detectIntentCategory(prompt)
	switch category {
	case intentCategoryQoS:
		return category, &qosKnowledgeCase
	case intentCategoryComputation:
		return category, &computationKnowledgeCase
	default:
		return intentCategoryACN, &acnKnowledgeCase
	}
}

func formatKnowledgeBrief(knowledge *knowledgeCase) string {
	if knowledge == nil {
		return "No domain reference matched the current request."
	}

	return fmt.Sprintf(
		"Domain: %s\nReference: %s\nWorkflow hints: %s",
		knowledge.Name,
		knowledge.Description,
		strings.Join(knowledge.ToolHints, " | "),
	)
}
