## Why

The current application is still a prototype: generation is mocked locally, execution is simulated, and the document flow is optimized for internal JSON state rather than a real product boundary. The next step is to make the app usable as a real frontend/backend product with a simpler operating model: the frontend owns skill editing, the backend owns chat completion, and YAML becomes the document exchanged between them.

## What Changes

- Replace mocked local generation with a real backend chat-completion workflow.
- Make YAML the canonical skill document exchanged across the frontend/backend boundary.
- Parse backend chat responses in the frontend, display the assistant message, and extract YAML skill documents when present.
- Keep skill editing entirely in the frontend after extraction, with no backend persistence.
- Remove prototype assumptions that generation and execution happen locally inside the client.
- **BREAKING**: The app will no longer treat in-memory JSON as the primary product contract for generation requests and responses; backend communication will use YAML documents and assistant messages.

## Capabilities

### New Capabilities
- `backend-chat-completion`: The system can send user prompts and optional YAML context to a backend service and render the assistant response.
- `yaml-skill-document`: The system can treat YAML as the canonical skill document format for interchange and editing workflows.
- `frontend-skill-editing`: The system can load an extracted YAML skill into the workspace and support direct frontend editing without persistence.

### Modified Capabilities

## Impact

- Affects the prompt/chat flow, workspace state model, document parsing/serialization, and graph/editor integration.
- Introduces a real backend API and shared request/response contract for chat completion and optional YAML skill payloads.
- Removes reliance on mock generator behavior as the primary product path.
- Defers persistence, authentication, and real remote execution; this change is focused on real generation plus frontend-owned editing.
