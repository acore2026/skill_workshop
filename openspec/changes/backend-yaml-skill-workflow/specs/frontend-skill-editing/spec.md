## ADDED Requirements

### Requirement: Extracted skill documents are editable entirely in the frontend
The system SHALL allow users to edit a loaded skill document in the frontend without requiring backend persistence or backend-applied mutations.

#### Scenario: User edits a generated skill
- **WHEN** a YAML skill document has been loaded into the workspace
- **THEN** the user can modify the skill through the frontend editor controls without sending those edits to the backend immediately

### Requirement: Chat rendering and document loading are decoupled
The system SHALL treat assistant chat rendering and skill-document loading as separate actions.

#### Scenario: Assistant replies conversationally
- **WHEN** the backend returns assistant text without a valid YAML skill document
- **THEN** the frontend still displays the assistant response and does not clear or overwrite the current editor state

### Requirement: Loaded documents can be reused in iterative prompting
The system SHALL let users continue chatting after editing, with the current frontend document used as the next request context.

#### Scenario: Iterative refinement
- **WHEN** the user edits a loaded skill and then asks for a refinement
- **THEN** the frontend sends the edited YAML document as context for the next backend request

### Requirement: No persistence is required for local editing
The system SHALL support the full generation-and-editing workflow without requiring stored drafts, saved sessions, or database-backed documents.

#### Scenario: Session ends without save
- **WHEN** the user refreshes or leaves the page after editing
- **THEN** the system is not required to restore the prior chat or document state
