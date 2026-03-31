package server

import (
	"fmt"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/agent/workflowagents/sequentialagent"
	"google.golang.org/adk/model"
	"google.golang.org/genai"
)

type skillAgents struct {
	pipeline agent.Agent
	checker  agent.Agent
}

func buildSkillWorkflowAgents(analysisLLM model.LLM, llm model.LLM) (*skillAgents, error) {
	intentAnalysisAgent, err := llmagent.New(llmagent.Config{
		Name:                "intent_analysis_agent",
		Description:         "Analyzes the request, confirms the intent category, and summarizes the workflow direction.",
		Model:               analysisLLM,
		InstructionProvider: intentAnalysisInstructionProvider,
		GenerateContentConfig: &genai.GenerateContentConfig{
			MaxOutputTokens: 80,
		},
		OutputKey: stateIntentAnalysisSummary,
	})
	if err != nil {
		return nil, fmt.Errorf("create intent analysis agent: %w", err)
	}

	writerAgent, err := llmagent.New(llmagent.Config{
		Name:                "skill_writer_agent",
		Description:         "Writes the markdown skill document from the request, category, and domain knowledge.",
		Model:               llm,
		InstructionProvider: writerInstructionProvider,
		OutputKey:           stateWriterMarkdownDraft,
	})
	if err != nil {
		return nil, fmt.Errorf("create skill writer agent: %w", err)
	}

	checkerAgent, err := llmagent.New(llmagent.Config{
		Name:                "markdown_format_checker_agent",
		Description:         "Checks and repairs markdown format and consistency before finalizing the skill document.",
		Model:               llm,
		InstructionProvider: checkerInstructionProvider,
		OutputKey:           stateSkillMarkdown,
	})
	if err != nil {
		return nil, fmt.Errorf("create markdown format checker agent: %w", err)
	}

	rootAgent, err := sequentialagent.New(sequentialagent.Config{
		AgentConfig: agent.Config{
			Name:        "skill_generation_workflow",
			Description: "Runs intent analysis and markdown skill writing in a fixed order.",
			SubAgents:   []agent.Agent{intentAnalysisAgent, writerAgent},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create root workflow agent: %w", err)
	}

	return &skillAgents{
		pipeline: rootAgent,
		checker:  checkerAgent,
	}, nil
}
