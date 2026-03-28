## ADDED Requirements

### Requirement: Frontend can request backend chat completion
The system SHALL allow the frontend to send a user chat request to a backend endpoint with the user message and optional current skill YAML context.

#### Scenario: Chat request without existing document
- **WHEN** the user submits a prompt and no skill document is loaded
- **THEN** the frontend sends the user message to the backend without requiring a YAML document

#### Scenario: Chat request with existing document
- **WHEN** the user submits a prompt while a skill document is loaded
- **THEN** the frontend includes the current YAML skill document as context in the backend request

### Requirement: Backend returns assistant text for chat rendering
The backend SHALL return assistant text that the frontend can render as a chat response regardless of whether a skill document is included.

#### Scenario: Response without skill document
- **WHEN** the backend returns assistant text without a YAML skill payload
- **THEN** the frontend displays the assistant text in chat and leaves the current workspace document unchanged

### Requirement: Backend can return optional skill YAML
The backend SHALL be able to return an optional YAML skill document alongside the assistant response.

#### Scenario: Response with skill YAML
- **WHEN** the backend returns assistant text and a valid YAML skill payload
- **THEN** the frontend can extract that YAML payload for workspace loading

### Requirement: Chat failures are surfaced without corrupting the workspace
The system SHALL surface backend request or response failures to the user without overwriting the currently loaded skill document.

#### Scenario: Backend request fails
- **WHEN** the backend request fails due to network or server error
- **THEN** the frontend shows an error state for the chat interaction and preserves the current workspace document
