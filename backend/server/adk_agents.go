package server

import (
	"fmt"
	"strings"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/agent/workflowagents/sequentialagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/functiontool"
)

type installSkillPackageArgs struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type installSkillPackageResult struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	OK      bool   `json:"ok"`
	Summary string `json:"summary"`
}

func buildSkillWorkflowAgent(llm model.LLM) (agent.Agent, error) {
	installTool, err := functiontool.New(functiontool.Config{
		Name:        "install_skill_package",
		Description: "Prepare the skill package needed before generating the final YAML skill document.",
	}, installSkillPackage)
	if err != nil {
		return nil, fmt.Errorf("create install_skill_package tool: %w", err)
	}

	analysisAgent, err := llmagent.New(llmagent.Config{
		Name:                "analysis_agent",
		Description:         "Analyzes the requested skill changes and explains what will change in the skill graph.",
		Model:               llm,
		InstructionProvider: analysisInstructionProvider,
		OutputKey:           stateAnalysisSummary,
	})
	if err != nil {
		return nil, fmt.Errorf("create analysis agent: %w", err)
	}

	packageAgent, err := llmagent.New(llmagent.Config{
		Name:                "package_agent",
		Description:         "Prepares the required package before the draft skill is generated.",
		Model:               llm,
		InstructionProvider: packageInstructionProvider,
		OutputKey:           statePackageSummary,
		Tools:               []tool.Tool{installTool},
	})
	if err != nil {
		return nil, fmt.Errorf("create package agent: %w", err)
	}

	draftAgent, err := llmagent.New(llmagent.Config{
		Name:                "draft_agent",
		Description:         "Generates the updated YAML skill document for the workspace.",
		Model:               llm,
		InstructionProvider: draftInstructionProvider,
		OutputKey:           stateSkillYAMLDraft,
	})
	if err != nil {
		return nil, fmt.Errorf("create draft agent: %w", err)
	}

	rootAgent, err := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:        "skill_generation_workflow",
			Description: "Runs analysis, package preparation, and YAML draft generation in a fixed order.",
			SubAgents:   []agent.Agent{analysisAgent, packageAgent, draftAgent},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create root workflow agent: %w", err)
	}

	return rootAgent, nil
}

func installSkillPackage(ctx tool.Context, args installSkillPackageArgs) (installSkillPackageResult, error) {
	name := strings.TrimSpace(args.Name)
	if name == "" {
		name = "6gcore_skill_creater"
	}
	version := strings.TrimSpace(args.Version)
	if version == "" {
		version = "latest"
	}

	summary := fmt.Sprintf("Prepared the %s package for agent-guided synthesis.", name)
	if err := ctx.State().Set(statePackageReady, true); err != nil {
		return installSkillPackageResult{}, err
	}
	if err := ctx.State().Set(statePackageSummary, summary); err != nil {
		return installSkillPackageResult{}, err
	}

	return installSkillPackageResult{
		Name:    name,
		Version: version,
		OK:      true,
		Summary: summary,
	}, nil
}
