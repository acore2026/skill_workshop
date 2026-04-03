# Project Overview: Skill Workshop Backend

This backend is a specialized **Agentic Workflow Engine** built using Google's **Agent Development Kit (ADK)**. Its purpose is to transform natural language user requests into structured, validated Markdown "skills" representing 6G signaling procedures.

## System Architecture

The system follows a coordinated multi-agent pattern, moving from intent analysis to draft generation and iterative format correction.

```ascii
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SKILL WORKSHOP BACKEND                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
              HTTP / WebSocket API    ▼    (Gorilla Mux/WS)
        ┌────────────────────────────────────────────────────────────┐
        │ /ws/agent-run  ───► [ WebSocket Handler ]                  │
        │ /api/tools     ───► [ Tool Catalog Loader ]                │
        └───────────────────────────┬────────────────────────────────┘
                                    │
                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │                     ADK ORCHESTRATOR                       │
        │ (Manages Session State, Retries, and Agent Choreography)   │
        └───────────────────────────┬────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
  ┌─────────────────┐                              ┌──────────────────┐
  │ PHASE 1: DRAFT  │                              │ PHASE 2: REVIEW  │
  │ (Sequential)    │                              │ (Iterative Fix)  │
  └────────┬────────┘                              └────────┬─────────┘
           │                                                │
    ┌──────▼──────┐                                  ┌──────▼──────┐
    │   Intent    │                                  │   Format    │
    │  Analysis   │                                  │   Checker   │
    │   Agent     │                                  │   Agent     │
    └──────┬──────┘                                  └──────┬──────┘
           │                                                │
    ┌──────▼──────┐                                         │
    │    Skill    │                                         │
    │   Writer    │◄────────────────────────────────────────┘
    │   Agent     │      (Up to 3 retries if validation fails)
    └──────┬──────┘
           │
           ▼
  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │  LLM Provider   │─────►│  Tool Catalog   │─────►│  Session State  │
  │ (OpenAI Compat) │      │  (Knowledge)    │      │   (In-Memory)   │
  └─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Core Components

### 1. API Layer (`server/http.go`)
*   **WebSocket (`/ws/agent-run`)**: The primary interface for triggering agent runs and receiving real-time telemetry (events, state deltas, status updates).
*   **Tool Catalog (`/api/tools`)**: Serves the domain knowledge required by the agents to ensure generated skills use valid network tools.

### 2. ADK Orchestrator (`server/adk_runtime.go`)
*   Handles the lifecycle of an agent run.
*   Integrates with ADK's `runner` and `session` (In-Memory) services.
*   Implements the "Checker Loop": if the output fails validation, it re-invokes the agents with issue descriptions for correction (max 3 attempts).

### 3. Agent Workflow (`server/adk_agents.go`)
*   **Intent Analysis Agent**: Categorizes the request and provides a high-level summary.
*   **Skill Writer Agent**: Generates the initial Markdown draft based on the analysis.
*   **Format Checker Agent**: Inspects the draft for schema violations and repairs them.

### 4. LLM Provider (`server/openai_compatible.go`)
*   Wraps the OpenAI-compatible Chat Completion API.
*   Supports toggleable reasoning/thinking modes (mapped to `genai.Part.Thought`).

## Key Workflows

### Agent Run Lifecycle
1.  **Handshake**: Client connects via WebSocket and sends a `start_run` message.
2.  **Initialization**: ADK Session is created with initial state (user request + tool catalog).
3.  **Drafting**: The `Intent Analysis` and `Skill Writer` agents run sequentially to produce a markdown document.
4.  **Validation**: The system runs `validateMarkdownSkill` against the draft.
5.  **Correction**: If errors exist, the `Format Checker` agent is invoked to repair the draft.
6.  **Finalization**: Once valid (or retries exhausted), the final skill is stored in the state and streamed to the client.

## Development Notes
*   **CORS**: Configurable via `AllowedOrigins` in the server config.
*   **Logging**: The orchestrator logs run IDs and session IDs for traceability.
*   **Validation Rules**: Strict rules for YAML frontmatter and tool call syntax are defined in `server/validators.go`.
