## Why

The current Execution page uses a purely client-side mock simulation with hardcoded data and artificial delays. To provide a real-world monitoring experience, the frontend must connect to the Go backend via WebSockets to receive live event streams (AI thoughts, tool calls, network signaling) as they occur in the ADK agentic layer.

## What Changes

- **WebSocket Integration**: Replace the `runSimulation` mock loop with a real WebSocket client connecting to `ws://localhost:8080/v1/intents/stream`.
- **Live Event Handling**: Implement handlers for backend-emitted event types: `ai_payload`, `llm_thought`, `network_pcap`, and `workflow_complete`.
- **Dynamic UI Updates**: Ensure the LLM Trace and PCAP views update in real-time as WebSocket messages arrive.
- **Intent Execution**: Update the "Execute Intent" trigger to send the structured `execute_intent` JSON payload to the backend.

## Capabilities

### New Capabilities
- `backend-websocket-client`: A centralized service/hook for managing the lifecycle of the WebSocket connection to the backend.
- `streaming-execution-events`: Logic for parsing and routing asynchronous backend events to the appropriate UI state handlers.

### Modified Capabilities
- `execution-monitor`: Update the monitor to drive its state from live WebSocket events instead of the local mock timer loop.

## Impact

- **Frontend**: `src/app/ExecutionPage.tsx` will be refactored to use the new WebSocket logic.
- **Data Flow**: Simulation state will now be populated incrementally via external messages rather than a local loop.
- **Error Handling**: Connection management and timeout handling for the WebSocket will be introduced.
