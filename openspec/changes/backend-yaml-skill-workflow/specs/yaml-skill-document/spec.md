## ADDED Requirements

### Requirement: YAML is the canonical skill document interchange format
The system SHALL use YAML as the canonical format for skill documents exchanged between the frontend and backend.

#### Scenario: Sending document context to backend
- **WHEN** the frontend sends an existing skill document as chat context
- **THEN** it sends the document as YAML rather than frontend-specific JSON

### Requirement: Frontend can parse skill YAML into the editable workspace model
The system SHALL parse valid skill YAML into the in-memory model used by the graph editor and inspector.

#### Scenario: Valid YAML payload is loaded
- **WHEN** the frontend receives a valid YAML skill document from the backend
- **THEN** it converts that YAML into the editable workspace document model

### Requirement: Frontend can serialize edited documents back to YAML
The system SHALL serialize the current editable workspace document back to YAML for future backend requests and user-visible inspection.

#### Scenario: Edited document is reused as context
- **WHEN** the user edits a loaded skill document and sends a follow-up prompt
- **THEN** the frontend serializes the updated workspace document to YAML before sending it to the backend

### Requirement: Invalid YAML does not replace the current document
The system SHALL reject invalid YAML payloads without replacing the currently loaded workspace document.

#### Scenario: YAML parse fails
- **WHEN** the backend response contains malformed or schema-invalid YAML
- **THEN** the frontend reports the parse failure and preserves the current workspace document
