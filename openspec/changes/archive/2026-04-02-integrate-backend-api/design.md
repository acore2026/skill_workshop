## Context

The Execution page currently relies on a client-side mock simulation. The backend project (`agentic-layer-custom`) now provides a WebSocket endpoint (`/v1/intents/stream`) that streams live orchestration events. We need to transition the frontend to consume these real-time events to drive the UI.

## Goals / Non-Goals

**Goals:**
- Replace the `runSimulation` mock logic with a real WebSocket client.
- Map backend event types (`ai_payload`, `network_pcap`, etc.) to the existing frontend state structures.
- Handle connection lifecycle (open, message, error, close).

**Non-Goals:**
- Implementing persistent history (remains transient for now).
- Implementing authentication for the WebSocket (assumed local/development for now).

## Decisions

### 1. Unified Event Dispatcher
We will implement a `handleWebSocketMessage` function that acts as a central router for all incoming events.
- **Rationale**: This ensures that as the backend adds more event types (e.g., `telemetry`, `latency`), we have a single place to handle them without cluttering the UI component.

### 2. Event Structure Mapping
The frontend `Packet` and `AIPayload` interfaces will be updated to match the backend JSON exactly where possible, or transformed during the routing phase.
- **Rationale**: Minimizes the overhead of data transformation while preserving the existing UI components' expectations.

### 3. Progressive Progress Bar
Since the backend doesn't know the "total" steps upfront in a dynamic agentic workflow, the progress bar will switch to an indeterminate state (or use a "percentage-of-known-milestones" approach) until the `workflow_complete` event is received.
- **Rationale**: Real-time agent flows are non-linear; hardcoded progress percentages are inaccurate for real integration.

## Risks / Trade-offs

- **[Risk] WebSocket Instability** → Long-running streams might drop.
  - **Mitigation**: Implement a basic reconnection strategy or clear error state in the UI if the connection fails mid-workflow.
- **[Trade-off] Direct State Updates** → Updating state for every small thought chunk might cause performance issues.
  - **Mitigation**: Use refs for scrolling and ensure state updates are efficient (e.g., functional updates in `useState`).
