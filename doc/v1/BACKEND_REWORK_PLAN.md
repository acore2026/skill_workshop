# Backend Rework Plan

## Goal

Rebuild the Go backend around real Google ADK runtime primitives instead of using ADK only as an `LLM` interface. The new backend should use ADK agents, ADK runner, ADK sessions, and ADK tools, while preserving the current frontend product behaviors:

- streaming conversation
- tool call visibility
- skill install visibility
- YAML skill generation applied in the frontend

Chosen defaults:

- keep `kimi-k2.5`
- keep the backend stateless
- keep WebSocket as the runtime transport
- remove the review stage
- move to ADK-native backend events, with a frontend adapter so current UI behaviors still work

## Current Gap Summary

- The backend currently uses `google.golang.org/adk/model` but does not use ADK as the runtime.
- Orchestration is hand-written in `backend/server/orchestrator.go`.
- Stage flow, tool events, YAML events, and status events are synthetic backend events.
- There is no `runner.Run(...)`, no `session.Service`, and no ADK agent tree.
- The frontend is tightly coupled to the synthetic event contract in `src/lib/api.ts` and `src/store/useStore.ts`.

## Checklist

### 1. Replace hand-written orchestration with real ADK runtime

- [x] Remove the current custom stage orchestration from the product path.
- [x] Stop calling `model.GenerateContent(...)` directly from the orchestrator.
- [x] Create a real ADK root agent tree instead of backend-managed stages.
- [x] Use `runner.New(...)` with a root agent and `session.InMemoryService()`.
- [x] Execute each run through `runner.Run(...)`.
- [x] Keep the backend stateless and per-run only.

### 2. Build the ADK agent tree

- [x] Create a root `sequentialagent`.
- [x] Add an `analysis_agent` using `llmagent`.
- [x] Add a `package_agent` for deterministic package preparation.
- [x] Add a `draft_agent` using `llmagent`.
- [x] Keep `draft_agent` as the final content-producing agent.
- [x] Keep the review stage removed.

### 3. Keep the current model path but make it an ADK provider bridge only

- [x] Keep `kimi-k2.5` as the active real model.
- [x] Keep the OpenAI-compatible Moonshot adapter as a `model.LLM` implementation only.
- [x] Remove any orchestration logic from the custom model adapter.
- [x] Ensure the adapter supports streaming for ADK runner execution.
- [x] Preserve retry/backoff behavior for Moonshot upstream failures.

### 4. Introduce real ADK tools and state usage

- [x] Implement `install_skill_package` as a real ADK tool using `functiontool`.
- [x] If package preparation remains deterministic, implement it inside ADK flow rather than emitting fake backend tool events.
- [x] Use ADK session state to pass data between sub-agents.
- [ ] Store at least:
- [x] `current_skill_yaml`
- [x] `latest_user_request`
- [x] `analysis_summary`
- [x] `package_ready`
- [x] `package_summary`
- [x] `skill_yaml_draft`
- [x] Use `OutputKey` or callbacks to persist important intermediate outputs to ADK session state.

### 5. Replace the WebSocket protocol with ADK-native event streaming

- [x] Keep `/ws/agent-run` as the socket endpoint.
- [x] Change the streamed backend contract to lifecycle wrappers plus ADK-native session events.
- [x] Support:
- [x] `run_started`
- [x] `session_event`
- [x] `run_complete`
- [x] `run_error`
- [x] Normalize ADK `session.Event` into JSON for the socket payload.
- [ ] Include at least:
- [x] `id`
- [x] `timestamp`
- [x] `invocation_id`
- [x] `author`
- [x] `branch`
- [x] `partial`
- [x] `turn_complete`
- [x] `final_response`
- [x] content parts / text
- [x] tool call / tool response data
- [x] event actions / state delta when present
- [x] long-running tool ids when present
- [x] Remove the synthetic backend event protocol from the product path:
- [x] `assistant_message_start`
- [x] `assistant_message_delta`
- [x] `assistant_message_complete`
- [x] `assistant_message`
- [x] `tool_call`
- [x] `tool_result`
- [x] `yaml_draft`
- [x] `yaml_final`

### 6. Preserve frontend chat/product behavior through an adapter

- [x] Add a frontend adapter that converts ADK `session_event` payloads into current UI concepts.
- [x] Preserve streaming conversation in the chat window.
- [x] Preserve tool call visibility in the timeline.
- [x] Preserve skill install visibility as a first-class UI event.
- [x] Preserve YAML detection and application into the workspace.
- [x] Group streamed assistant content by ADK invocation/author rather than current custom message ids.
- [x] Keep hybrid streaming Markdown rendering working with ADK partial text events.
- [x] Preserve the current workspace when YAML is invalid.
- [x] Surface YAML parse errors in the existing YAML/utility UI.

### 7. Update backend run flow semantics

- [x] Seed each ADK session with the current YAML and latest user request.
- [x] Ensure `analysis_agent` produces human-facing streamed analysis content.
- [x] Ensure `package_agent` emits visible package-prep activity through ADK events.
- [x] Ensure `draft_agent` generates fenced YAML that matches the frontend schema.
- [x] Treat `draft_agent` as the authoritative final skill output.
- [x] End the run after the draft is complete and validated.

### 8. Add backend validation and output guards

- [x] Reject empty final draft responses.
- [x] Reject final draft responses that do not contain fenced YAML.
- [x] Keep YAML extraction on the backend minimal and product-safe.
- [x] Do not silently convert malformed outputs into fake success events.
- [x] Emit `run_error` on invalid final outputs or execution failures.

### 9. Backend implementation structure

- [x] Add a dedicated agent-construction layer for building the ADK agent tree.
- [x] Add a runner/session bootstrap layer.
- [x] Add an ADK event serialization layer for WebSocket output.
- [x] Keep HTTP/WebSocket transport separate from ADK runtime construction.
- [x] Keep config loading separate from runtime wiring.

### 10. Frontend interface changes

- [x] Update `src/lib/api.ts` to consume ADK-native socket events.
- [x] Update `src/store/useStore.ts` to process ADK event payloads.
- [x] Keep the model selector behavior unchanged from the user’s perspective.
- [x] Keep `Qwen3-32B` simulation mode working until explicitly removed later.
- [x] Do not regress chat rendering, skill install pills, or streamed Markdown behavior.

### 11. Tests

- [ ] Backend unit tests:
- [ ] runner construction with root agent + in-memory session service
- [ ] package tool behavior
- [ ] package agent state writes
- [ ] draft-agent final output validation
- [ ] ADK event normalization into socket payloads
- [x] Backend integration tests:
- [x] WebSocket run emits `run_started`, multiple `session_event`s, and `run_complete`
- [ ] streaming assistant text arrives as multiple partial events
- [ ] tool execution appears through ADK events
- [ ] invalid final draft produces `run_error`
- [x] Frontend tests:
- [ ] ADK partial events append into a single streaming chat message
- [x] tool/function events render in the chat timeline
- [x] skill install remains visible in the UI
- [ ] valid YAML updates the workspace
- [ ] invalid YAML does not corrupt the workspace

## Implementation Notes

### ADK runtime choices

- Use `runner.Config` with:
  - `AppName`
  - `Agent`
  - `SessionService: session.InMemoryService()`
- Use `agent.RunConfig{StreamingMode: agent.StreamingModeSSE}` for real backend runs.
- Use `sequentialagent` as the root because the run flow is ordered and deterministic.

### Agent responsibilities

- `analysis_agent`
  - reads current YAML and user request
  - streams concise analysis back to the UI
  - stores summary to session state

- `package_agent`
  - prepares `6gcore_skill_creater`
  - exposes that work through ADK-native tool/agent events
  - stores package readiness to session state

- `draft_agent`
  - consumes current YAML, request, and analysis/package state
  - emits final fenced YAML
  - is the authoritative final output of the run

### Event bridge policy

- Backend should not reintroduce a second custom semantic protocol.
- The only backend transport-specific wrapper should be:
  - lifecycle envelope
  - normalized ADK `session.Event`
- UI-specific interpretation happens in the frontend adapter layer.

## Public Interfaces

### WebSocket request

Keep the request envelope close to current behavior:

```json
{
  "type": "start_run",
  "run_id": "string",
  "messages": [{ "role": "user|assistant", "content": "string" }],
  "current_skill_yaml": "string",
  "context": {}
}
```

### WebSocket response

New top-level event types:

```json
{
  "type": "run_started | session_event | run_complete | run_error",
  "run_id": "string",
  "timestamp": "RFC3339 timestamp",
  "payload": {}
}
```

For `session_event`, `payload` is a normalized ADK `session.Event`.

## Acceptance Criteria

- A real backend run uses ADK `runner.Run(...)`, not a hand-written orchestrator loop.
- The backend uses a real ADK agent tree.
- The backend uses a real ADK session service.
- The backend uses a real ADK tool for package installation/prep behavior.
- The frontend still shows:
  - streaming conversation
  - tool activity
  - skill install activity
  - workspace YAML updates
- `Enable Turbo Mode for Gaming` runs end-to-end without the removed review stage.
- Final YAML comes from the draft agent and updates the workspace correctly.

## Assumptions

- The current frontend YAML schema remains the skill contract.
- The backend remains stateless and non-persistent.
- Moonshot `kimi-k2.5` remains the production real model for now.
- Gemini-native migration is out of scope for this rework.
- The frontend may change internally, but visible product behaviors should remain intact.
