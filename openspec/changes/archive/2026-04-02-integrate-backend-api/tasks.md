## 1. Type and Interface Alignment

- [x] 1.1 Update `AIPayload` and `Packet` interfaces in `ExecutionPage.tsx` to align with the backend API Design.
- [x] 1.2 Define the `WebSocketMessage` type to cover all event types (`ai_payload`, `llm_thought`, `network_pcap`, `workflow_complete`).

## 2. WebSocket Logic Implementation

- [x] 2.1 Refactor `runSimulation` into an async `handleExecuteIntent` function.
- [x] 2.2 Implement the WebSocket connection lifecycle logic (initialize connection on "Execute Intent").
- [x] 2.3 Implement the message listener and central `handleWebSocketMessage` router.

## 3. Event Handling

- [x] 3.1 Implement the `ai_payload` handler to append to the LLM Payloads view.
- [x] 3.2 Implement the `network_pcap` handler to append to the PCAP Traffic table.
- [x] 3.3 Implement the `workflow_complete` handler to stop progress and reset processing state.
- [x] 3.4 (Optional) Implement basic `llm_thought` rendering as dimmed text in the assistant payload.

## 4. UI/UX and Error Handling

- [x] 4.1 Update the progress bar to show an indeterminate state during WebSocket streaming.
- [x] 4.2 Add error handling for WebSocket connection failures (e.g., toast notification or console error).
- [x] 4.3 Remove the hardcoded `sleep` delays and mock loop logic from `ExecutionPage.tsx`.
