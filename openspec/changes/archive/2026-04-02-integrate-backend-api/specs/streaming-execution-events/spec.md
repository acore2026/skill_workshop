## ADDED Requirements

### Requirement: Event Type Routing
The system SHALL parse incoming WebSocket messages and route them to the appropriate state handlers based on the `type` field (`ai_payload`, `llm_thought`, `network_pcap`, `workflow_complete`).

#### Scenario: Routing an ai_payload event
- **WHEN** a message of type `ai_payload` is received
- **THEN** it is appended to the LLM API Payloads view

#### Scenario: Routing a network_pcap event
- **WHEN** a message of type `network_pcap` is received
- **THEN** it is appended to the Simulated Network Traffic (PCAP) table

### Requirement: Workflow Completion Handling
The system SHALL stop the execution progress indicators and reset the processing state upon receiving a `workflow_complete` event.

#### Scenario: Handling completion
- **WHEN** a message of type `workflow_complete` is received
- **THEN** the "Execute Intent" button becomes active again and the progress bar reflects 100% completion
