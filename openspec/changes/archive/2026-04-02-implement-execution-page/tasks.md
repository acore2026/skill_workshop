## 1. State and Data Setup

- [x] 1.1 Port mock data generation logic and ACN scenarios from the reference HTML.
- [x] 1.2 Initialize local component state for payloads, packets, progress, and selected packet in `ExecutionPage.tsx`.

## 2. Core Layout and Control Bar

- [x] 2.1 Replace the `ExecutionPage` skeleton with the split-panel layout (50/50 flex).
- [x] 2.2 Implement the interactive control bar with the intent input field and "Execute Intent" button.
- [x] 2.3 Implement the animated simulation progress bar.

## 3. LLM API Payloads (Left Panel)

- [x] 3.1 Implement the `LLM API Payloads` list with distinct styling for user/assistant roles.
- [x] 3.2 Add auto-scroll behavior to the payloads container.

## 4. PCAP Traffic and Details (Right Panel)

- [x] 4.1 Implement the PCAP table with Time, Source, Destination, Protocol, and Info columns.
- [x] 4.2 Implement the Packet Details inspector view with expandable JSON layers (accordion style).
- [x] 4.3 Add double-click interaction to PCAP rows to trigger the details view.

## 5. Simulation Engine

- [x] 5.1 Implement the `runSimulation` async function with realistic `sleep` delays.
- [x] 5.2 Integrate the AI routing and Tool execution phases into the simulation loop.
- [x] 5.3 Ensure the UI updates reactively as the simulation progresses.
