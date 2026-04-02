package server

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"google.golang.org/adk/agent"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

const maxCheckerAttempts = 3

type AgentOrchestrator interface {
	Run(ctx context.Context, req StartRunRequest, emit func(StreamEvent) error) error
}

type ADKOrchestrator struct {
	appName        string
	cfg            Config
	sessionService session.Service
}

func NewADKOrchestrator(ctx context.Context, cfg Config) (*ADKOrchestrator, error) {
	_ = ctx
	sessionService := session.InMemoryService()

	return &ADKOrchestrator{
		appName:        cfg.AppName,
		cfg:            cfg,
		sessionService: sessionService,
	}, nil
}

func newRunner(appName string, root agent.Agent, sessionService session.Service) (*runner.Runner, error) {
	return runner.New(runner.Config{
		AppName:        appName,
		Agent:          root,
		SessionService: sessionService,
	})
}

func (o *ADKOrchestrator) Run(ctx context.Context, req StartRunRequest, emit func(StreamEvent) error) error {
	runID := strings.TrimSpace(req.RunID)
	if runID == "" {
		runID = uuid.NewString()
	}

	userPrompt := latestUserPrompt(req.Messages)
	sessionID := "run-" + runID
	userID := "skill-workshop-user"
	catalog, err := loadNormalizedToolCatalog()
	if err != nil {
		return err
	}
	baseLLM := NewOpenAICompatibleLLM(o.cfg.LLMModel, o.cfg.LLMBaseURL, o.cfg.LLMAPIKey)
	analysisLLM := baseLLM.WithThinkingEnabled(false)
	writerLLM := baseLLM.WithThinkingEnabled(req.ReasoningEnabled)
	agents, err := buildSkillWorkflowAgents(analysisLLM, writerLLM)
	if err != nil {
		return err
	}
	pipelineRunner, err := newRunner(o.appName, agents.pipeline, o.sessionService)
	if err != nil {
		return fmt.Errorf("create pipeline runner: %w", err)
	}
	checkerRunner, err := newRunner(o.appName, agents.checker, o.sessionService)
	if err != nil {
		return fmt.Errorf("create checker runner: %w", err)
	}
	initialState := buildInitialState(req, catalog)

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
	if err := emitStatusSessionEvent(runID, "intent_analysis_agent", "Analyzing request.", emit); err != nil {
		return err
	}

	if err := o.runAgent(ctx, pipelineRunner, userID, sessionID, userPrompt, nil, runID, emit); err != nil {
		return err
	}

	runState, err := o.loadSessionState(ctx, userID, sessionID)
	if err != nil {
		return err
	}

	currentDraft := extractMarkdownArtifact(formatStateString(runState[stateWriterMarkdownDraft], ""))
	if strings.TrimSpace(currentDraft) == "" {
		return fmt.Errorf("skill writer agent did not emit a markdown draft")
	}

	issues := validateMarkdownSkill(currentDraft, catalog)
	if len(issues) == 0 {
		if err := emitStatusSessionEvent(runID, "markdown_format_checker_agent", "Skill format check passed.", emit); err != nil {
			return err
		}
		if err := emit(NewEvent(runID, "session_event", normalizedSessionEvent{
			ID:            uuid.NewString(),
			Timestamp:     time.Now().UTC().Format(time.RFC3339Nano),
			InvocationID:  uuid.NewString(),
			Author:        "markdown_format_checker_agent",
			Partial:       false,
			TurnComplete:  true,
			FinalResponse: true,
			StateDelta: map[string]any{
				stateSkillMarkdown: currentDraft,
			},
		})); err != nil {
			return err
		}
		log.Printf("agent run completed without checker rewrite: run_id=%s session_id=%s", runID, sessionID)
		return emit(NewEvent(runID, "run_complete", map[string]any{
			"status": "completed",
		}))
	}

	for attempt := 1; attempt <= maxCheckerAttempts; attempt++ {
		statusText := "Checking skill format."
		if len(issues) > 0 && attempt > 1 {
			statusText = "Fixing skill format."
		}
		if err := emitStatusSessionEvent(runID, "markdown_format_checker_agent", statusText, emit); err != nil {
			return err
		}

		stateDelta := map[string]any{
			stateWriterMarkdownDraft: currentDraft,
			stateCheckerAttemptCount: attempt,
			stateCheckerIssues:       formatMarkdownIssues(issues),
		}
		if err := o.runAgent(ctx, checkerRunner, userID, sessionID, "Validate and correct the markdown skill draft.", stateDelta, runID, emit); err != nil {
			return err
		}

		runState, err = o.loadSessionState(ctx, userID, sessionID)
		if err != nil {
			return err
		}

		checkedDraft := extractMarkdownArtifact(formatStateString(runState[stateSkillMarkdown], ""))
		if strings.TrimSpace(checkedDraft) == "" {
			return fmt.Errorf("markdown format checker agent did not emit a markdown skill document")
		}

		issues = validateMarkdownSkill(checkedDraft, catalog)
		if len(issues) == 0 {
			log.Printf("agent run completed: run_id=%s session_id=%s", runID, sessionID)
			return emit(NewEvent(runID, "run_complete", map[string]any{
				"status": "completed",
			}))
		}

		currentDraft = checkedDraft
	}

	return fmt.Errorf("markdown format checker could not produce valid markdown after %d attempts: %s", maxCheckerAttempts, strings.Join(issues, "; "))
}

func (o *ADKOrchestrator) runAgent(
	ctx context.Context,
	adkRunner *runner.Runner,
	userID string,
	sessionID string,
	prompt string,
	stateDelta map[string]any,
	runID string,
	emit func(StreamEvent) error,
) error {
	runConfig := agent.RunConfig{StreamingMode: agent.StreamingModeSSE}
	userContent := genai.NewContentFromText(prompt, genai.RoleUser)
	coalescer := newPartialEventCoalescer(runID, emit)
	analysisCompleted := false
	writerStarted := false

	runOptions := []runner.RunOption{}
	if len(stateDelta) > 0 {
		runOptions = append(runOptions, runner.WithStateDelta(stateDelta))
	}

	for event, err := range adkRunner.Run(ctx, userID, sessionID, userContent, runConfig, runOptions...) {
		if err != nil {
			return fmt.Errorf("runner execution failed: %w", err)
		}
		if event == nil || event.Author == "user" {
			continue
		}
		normalized := normalizeADKEvent(event)
		if normalized.Author == "skill_writer_agent" && !writerStarted {
			if err := coalescer.flush(); err != nil {
				return err
			}
			if err := emitStatusSessionEvent(runID, "skill_writer_agent", "Starting skill draft.", emit); err != nil {
				return err
			}
			writerStarted = true
		}
		if err := coalescer.push(normalized); err != nil {
			return err
		}
		if normalized.Author == "intent_analysis_agent" && normalized.FinalResponse && !analysisCompleted {
			if err := coalescer.flush(); err != nil {
				return err
			}
			if err := emitStatusSessionEvent(runID, "intent_analysis_agent", "Analysis completed.", emit); err != nil {
				return err
			}
			if !writerStarted {
				if err := emitStatusSessionEvent(runID, "skill_writer_agent", "Starting skill draft.", emit); err != nil {
					return err
				}
				writerStarted = true
			}
			analysisCompleted = true
		}
		if normalized.Author == "skill_writer_agent" && normalized.FinalResponse {
			if err := coalescer.flush(); err != nil {
				return err
			}
			if err := emitStatusSessionEvent(runID, "skill_writer_agent", "Skill draft completed.", emit); err != nil {
				return err
			}
		}
	}

	if err := coalescer.flush(); err != nil {
		return err
	}

	return nil
}

func (o *ADKOrchestrator) loadSessionState(ctx context.Context, userID string, sessionID string) (map[string]any, error) {
	sessionResponse, err := o.sessionService.Get(ctx, &session.GetRequest{
		AppName:   o.appName,
		UserID:    userID,
		SessionID: sessionID,
	})
	if err != nil {
		return nil, fmt.Errorf("load adk session: %w", err)
	}

	values := map[string]any{}
	for key, value := range sessionResponse.Session.State().All() {
		values[key] = value
	}
	return values, nil
}

func emitStatusSessionEvent(runID string, author string, text string, emit func(StreamEvent) error) error {
	return emit(NewEvent(runID, "session_event", normalizedSessionEvent{
		ID:            uuid.NewString(),
		Timestamp:     time.Now().UTC().Format(time.RFC3339Nano),
		InvocationID:  uuid.NewString(),
		Author:        author,
		Partial:       false,
		TurnComplete:  false,
		FinalResponse: false,
		Text:          text,
	}))
}
