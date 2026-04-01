## Context

The current Skill Workshop has a skeleton Execution page with basic placeholders. We have a reference HTML implementation (`page_reference_tmp.html`) that provides a comprehensive "6G AI Core NOC" style interface featuring a split-view layout for LLM trace payloads and PCAP-style simulated network traffic.

## Goals / Non-Goals

**Goals:**
- Implement the split-view layout (LLM API Payloads on the left, PCAP table on the right).
- Implement the interactive control bar (intent input and execute button).
- Integrate a client-side mock execution engine that simulates the sequential steps of an ACN (Embodied Agent) workflow, generating realistic-looking JSON payloads and packet details.

**Non-Goals:**
- Connecting to a real backend tool runner (this remains a frontend simulation for now).
- Persisting execution history across sessions.

## Decisions

### 1. Local Component State for Mock Execution
The simulation state (payloads, packets, progress, processing status) will be managed locally within `ExecutionPage.tsx` using React's `useState` hook.
- **Rationale**: Since this is a transient mock implementation, there is no need to add complexity to the global Zustand store (`useStore.ts`).

### 2. Async Simulation Engine
The `runSimulation` logic will use an `async` function with `await sleep(...)` to artificially simulate the timing and sequential nature of real network interactions and LLM reasoning delays.
- **Rationale**: This approach accurately mimics the real-world flow without requiring an actual backend or complex state machines.

### 3. Inline Component Architecture
For this initial implementation, the entire execution simulation UI (including the PCAP table, Payload list, and Packet Details view) will reside within `src/app/ExecutionPage.tsx` (or possibly extracted to `src/features/execution/ExecutionMonitor.tsx` if it becomes too large).
- **Rationale**: Reduces architectural overhead while building the mock. We can refactor into smaller components later when integrating with a real backend.

## Risks / Trade-offs

- **[Risk] Component Bloat** → Packing the entire UI and mock logic into one file could make it hard to maintain.
  - **Mitigation**: We will clearly section the file (State, Simulation Engine, Render blocks) to maintain readability. If it exceeds manageable limits, we will extract the mock data generation functions to a separate utility file.
