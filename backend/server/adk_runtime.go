package server

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/google/uuid"
	"google.golang.org/adk/agent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

type AgentOrchestrator interface {
	Run(ctx context.Context, req StartRunRequest, emit func(StreamEvent) error) error
}

type ADKOrchestrator struct {
	appName        string
	model          model.LLM
	sessionService session.Service
	runner         *runner.Runner
}

func NewADKOrchestrator(ctx context.Context, cfg Config) (*ADKOrchestrator, error) {
	_ = ctx
	llm := NewOpenAICompatibleLLM(cfg.LLMModel, cfg.LLMBaseURL, cfg.LLMAPIKey)
	rootAgent, err := buildSkillWorkflowAgent(llm)
	if err != nil {
		return nil, err
	}

	sessionService := session.InMemoryService()
	adkRunner, err := runner.New(runner.Config{
		AppName:        cfg.AppName,
		Agent:          rootAgent,
		SessionService: sessionService,
	})
	if err != nil {
		return nil, fmt.Errorf("create adk runner: %w", err)
	}

	return &ADKOrchestrator{
		appName:        cfg.AppName,
		model:          llm,
		sessionService: sessionService,
		runner:         adkRunner,
	}, nil
}

func (o *ADKOrchestrator) Run(ctx context.Context, req StartRunRequest, emit func(StreamEvent) error) error {
	runID := strings.TrimSpace(req.RunID)
	if runID == "" {
		runID = uuid.NewString()
	}

	userPrompt := latestUserPrompt(req.Messages)
	sessionID := "run-" + runID
	userID := "skill-workshop-user"
	initialState := buildInitialState(req)

	if _, err := o.sessionService.Create(ctx, &session.CreateRequest{
		AppName:   o.appName,
		UserID:    userID,
		SessionID: sessionID,
		State:     initialState,
	}); err != nil {
		return fmt.Errorf("create adk session: %w", err)
	}

	log.Printf("agent run started: run_id=%s session_id=%s", runID, sessionID)
	if err := emit(NewEvent(runID, "run_started", map[string]any{
		"mode": "adk_runner",
	})); err != nil {
		return err
	}

	runConfig := agent.RunConfig{StreamingMode: agent.StreamingModeSSE}
	userContent := genai.NewContentFromText(userPrompt, genai.RoleUser)

	for event, err := range o.runner.Run(ctx, userID, sessionID, userContent, runConfig, runner.WithStateDelta(initialState)) {
		if err != nil {
			return fmt.Errorf("runner execution failed: %w", err)
		}
		if event == nil || event.Author == "user" {
			continue
		}
		if err := emitNormalizedADKEvent(runID, event, emit); err != nil {
			return err
		}
	}

	sessionResponse, err := o.sessionService.Get(ctx, &session.GetRequest{
		AppName:   o.appName,
		UserID:    userID,
		SessionID: sessionID,
	})
	if err != nil {
		return fmt.Errorf("load adk session: %w", err)
	}
	finalDraft, _ := sessionResponse.Session.State().Get(stateSkillYAMLDraft)
	finalDraftText, _ := finalDraft.(string)
	if strings.TrimSpace(finalDraftText) == "" {
		return fmt.Errorf("draft agent did not emit a fenced YAML block")
	}

	log.Printf("agent run completed: run_id=%s session_id=%s", runID, sessionID)
	return emit(NewEvent(runID, "run_complete", map[string]any{
		"status": "completed",
	}))
}
