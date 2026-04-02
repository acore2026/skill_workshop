## Why

The current Execution page is a skeleton with basic placeholders. Users need a functional interface to visualize and simulate how skills are executed through AI intent analysis and sequential tool calls, mirroring real-world 6G NOC (Network Operations Center) monitoring.

## What Changes

- **Execution Simulation View**: Implement the full split-view layout on the Execution page.
  - Left panel: "LLM API Payloads" to show request/response JSON between the agent and LLM.
  - Right panel: "Simulated Network Traffic (PCAP)" to show tool execution as network signaling packets.
  - Bottom-right: "Packet Details" view for deep-diving into individual signal frames.
- **Mock Execution Engine**: Add a client-side simulation engine that mimics the agent workflow (ACN scenario) with realistic timing and mock data.
- **Interactive Control Bar**: Implement an input field for intent and an "Execute" button to trigger the simulation.
- **Visual Feedback**: Add a progress bar and status indicators during the simulation.

## Capabilities

### New Capabilities
- `execution-pcap-view`: Ability to visualize tool calls as simulated network traffic in a PCAP-style table.
- `execution-llm-trace`: Ability to visualize the raw LLM API interaction payloads during execution.

### Modified Capabilities
- `execution-monitor`: Refine the layout from basic placeholders to the functional split-view simulator.

## Impact

- **Frontend**: `src/app/ExecutionPage.tsx` will be completely overhauled with the new simulation logic and UI components.
- **State**: `src/store/useStore.ts` may be updated to hold the simulation results (though still non-persistent).
- **Styling**: New styles for the PCAP table and detail views.
