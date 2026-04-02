# Skill Workshop Productization Plan

Use this file as the working checklist while implementing the Go ADK backend architecture:
- frontend owns graph editing
- YAML is the canonical skill document
- backend is a stateless Go agent service
- frontend streams typed agent events over WebSocket and applies YAML artifacts as they arrive

Mark completed work by changing `- [ ]` to `- [x]`.

## 1. Replace the Backend Runtime

- [x] Remove the current Node + TypeScript backend from the product path.
- [x] Create a Go backend service in the repo as the canonical API server.
- [x] Add a clear Go module layout for config, websocket transport, agent orchestration, and event serialization.
- [x] Keep the backend stateless: no persistence, no server-owned skill document, no database.
- [x] Move runtime configuration to Go env/config handling for backend port, model settings, and allowed origins.
- [x] Update local dev commands so the frontend can launch the Go backend with `npm run api`.

## 2. Implement a Real Skill-Generating Agent with ADK-Go

- [x] Build a real multi-step skill-generation agent using Google `adk-go`.
- [x] Give the agent the current user prompt plus the current frontend YAML skill document as context.
- [x] Configure the agent to reason across multiple LLM turns per run rather than a single relay call.
- [x] Define backend tool-style events for intermediate analysis, package install, and skill-edit steps.
- [x] Require the agent to emit YAML skill updates as fenced YAML content and normalize them into YAML artifact events.
- [x] End each run only when the backend emits an explicit completion event and a final authoritative YAML artifact.
- [x] Keep the backend responsible for orchestrating multiple LLM calls, but not for owning or persisting the workspace state.

## 3. Replace HTTP Generation with WebSocket Streaming

- [x] Replace `POST /api/chat/generate` as the primary generation path with a WebSocket endpoint.
- [x] Use one WebSocket connection per run: frontend opens a socket for a prompt, backend streams events, backend closes when complete.
- [x] Keep `GET /api/health` as a lightweight HTTP health check for mode and availability display.
- [x] Define a typed event protocol for the socket.
- [x] Stream `run_started` events.
- [x] Stream `assistant_message` events.
- [x] Stream `tool_call` events.
- [x] Stream `tool_result` events.
- [x] Stream `yaml_draft` events.
- [x] Stream `yaml_final` events.
- [x] Stream `run_complete` events.
- [x] Stream `run_error` events.
- [x] Ensure all streamed events are JSON with stable `type`, `run_id`, `timestamp`, and typed payload fields.
- [x] Support deployed frontend access with HTTP CORS and WebSocket origin validation.

## 4. Update the Frontend Transport and State Model

- [x] Replace backend generation fetch calls with WebSocket run handling.
- [x] Keep simulation mode available behind the existing switch as a fallback path.
- [x] Add frontend run lifecycle handling for socket connect, streaming, completion, and failure.
- [x] Render streamed backend messages incrementally in the chat UI as real agent output.
- [x] Show tool-call and tool-result events as first-class chat timeline entries.
- [x] Apply every valid `yaml_draft` event immediately to the workspace.
- [x] Replace the workspace again when a later valid `yaml_draft` arrives.
- [x] Treat `yaml_final` as the authoritative final workspace state for the run.
- [x] Preserve the current workspace if a streamed YAML payload is invalid, and show a parse/apply error in the UI.
- [x] Keep raw YAML visible in the YAML panel and keep graph edits regenerating YAML locally.

## 5. Define the Backend-Frontend Event and YAML Contract

- [x] Document the WebSocket request envelope sent by the frontend.
- [x] Include `run_id` in the request envelope.
- [x] Include `messages` in the request envelope.
- [x] Include `current_skill_yaml` in the request envelope.
- [x] Include optional frontend context in the request envelope.
- [x] Document the backend event envelope.
- [x] Include `type` in the event envelope.
- [x] Include `run_id` in the event envelope.
- [x] Include `timestamp` in the event envelope.
- [x] Include `payload` in the event envelope.
- [x] Define payloads for assistant text messages.
- [x] Define payloads for tool invocation and result telemetry.
- [x] Define payloads for YAML draft text.
- [x] Define payloads for final YAML text.
- [x] Define payloads for terminal errors.
- [x] Keep YAML as the canonical skill interchange format between frontend and backend.
- [x] Keep the frontend as the owner of manual workspace edits; backend-generated YAML only replaces frontend state when valid.

## 6. Agent Prompting and Output Rules

- [x] Add backend system prompts that make the agent behave like a real skill-creation assistant instead of a raw relay.
- [x] Instruct the agent to narrate meaningful intermediate analysis when useful.
- [x] Instruct the agent to generate valid YAML matching the current frontend schema for cards, links, and attributes.
- [x] Instruct the agent to emit iterative YAML drafts during refinement and a final YAML artifact at completion.
- [x] Instruct the agent to prefer coherent edits to the current skill instead of unnecessary resets.
- [x] Keep success/failure terminal semantics and data-card attribute semantics aligned with the existing frontend YAML schema.

## 7. Tests

- [x] Add Go backend tests for health behavior and WebSocket handshake behavior.
- [x] Add Go tests for event streaming over a run lifecycle.
- [x] Add Go tests for origin enforcement on the WebSocket endpoint.
- [x] Keep frontend tests for YAML extraction and parse/apply behavior passing after the transport change.
- [x] Keep frontend tests for graph -> YAML conversion passing.
- [x] Keep frontend tests for YAML -> graph conversion passing.
- [x] Keep frontend tests for data-card attribute handle generation passing.
- [x] Keep frontend tests confirming success/failure cards do not expose data ports.
- [x] Verify an acceptance scenario for: empty workspace -> prompt -> streamed YAML draft(s) -> workspace update -> final YAML -> run complete.
- [x] Verify the backend failure path surfaces an error while preserving the last valid workspace state.

## 8. Assumptions

- [x] Google `adk-go` is the required backend agent framework.
- [x] Backend remains stateless and non-persistent.
- [x] Frontend remains the owner of the current editable workspace state.
- [x] YAML remains the canonical skill interchange format.
- [x] The visible Simulation/Real Backend switch remains in the product.
- [x] One WebSocket connection is created per run and closed when that run completes.
- [x] The frontend applies every valid streamed YAML draft, with the final YAML event treated as authoritative.

## 9. Tracking Rule

- [x] Update `PLAN.md` to reflect the Go ADK + WebSocket architecture.
- [x] Update `PLAN.md` continuously during implementation.
- [x] Mark each completed task with `- [x]` as soon as it is done.
