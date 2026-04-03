## ADDED Requirements

### Requirement: Backend WebSocket Connection
The application SHALL establish a WebSocket connection to `ws://localhost:8080/v1/intents/stream` when the "Execute Intent" action is triggered.

#### Scenario: Connecting to backend
- **WHEN** the user clicks "Execute Intent"
- **THEN** a WebSocket connection is opened to the backend endpoint

### Requirement: Intent Transmission
The application SHALL send an `execute_intent` JSON message containing the user intent over the open WebSocket.

#### Scenario: Sending intent
- **WHEN** the WebSocket connection is successfully opened
- **THEN** the application sends the intent payload to the backend
