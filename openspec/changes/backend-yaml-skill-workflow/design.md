## Context

The current repository is a single frontend prototype. It uses a local generator adapter, mock execution state, and a `SkillDocument` object shaped for client-side convenience. The user now wants to turn this into a real product while keeping the operating model simple:

- the frontend sends a user request to a backend;
- the backend returns a real chat completion message;
- if the response includes a YAML skill document, the frontend extracts it and loads it for editing;
- all skill editing remains in the frontend;
- there is no persistence in this phase.

This creates a deliberate boundary. The backend is responsible for chat completion only. The frontend is responsible for rendering chat, parsing YAML, managing the editable document, and keeping the graph/editor views in sync.

## Goals / Non-Goals

**Goals:**
- Replace the local mocked generation path with a real backend request/response flow.
- Define a stable API contract where assistant messages may optionally include a YAML skill document.
- Make YAML the canonical interchange format and the primary artifact exchanged with the backend.
- Keep the editing loop simple: once YAML is extracted, the frontend loads and edits it locally.
- Remove dependence on mock-generation behavior for the main product path.

**Non-Goals:**
- Persistence of chat history or skill documents.
- Multi-user collaboration, authentication, or authorization.
- Real execution of generated skills against external systems.
- A fully autonomous backend-driven editor that mutates documents directly.
- Rich server-side validation beyond basic response shaping.

## Decisions

### 1. Backend scope is limited to chat completion

The backend will expose a small HTTP API that accepts a user message plus optional current YAML document context and returns:
- assistant display text;
- optional YAML skill payload;
- optional metadata for diagnostics.

Rationale:
- This keeps the backend narrow and replaceable.
- It avoids coupling backend logic to the frontend’s graph editor internals.
- It matches the user’s request to keep editing fully in the frontend.

Alternatives considered:
- Returning structured graph JSON from the backend. Rejected because it would split ownership of the editor model and make the backend responsible for frontend-specific structure.
- Letting the backend apply document mutations directly. Rejected because it complicates conflict handling and is unnecessary without persistence.

### 2. YAML is the canonical product contract, but the frontend may keep a parsed model in memory

The frontend still needs a structured in-memory representation to drive the graph editor, inspector, and validation UI. However, the canonical exchange format becomes YAML. The frontend will parse YAML into the local model on load and serialize the model back to YAML on edits or when preparing backend context.

Rationale:
- The graph editor cannot operate directly on raw YAML text alone.
- YAML satisfies the product requirement for a human-readable document contract.
- A parse/serialize layer gives the frontend a stable editing model without exposing that model as the backend contract.

Alternatives considered:
- Making raw YAML the only state in the frontend. Rejected because every UI edit would become text manipulation and make graph editing fragile.
- Keeping JSON as the canonical contract and merely exporting YAML. Rejected because it conflicts with the requested product direction.

### 3. Assistant messages and YAML extraction are separate concerns

The backend response will always include assistant text for rendering in chat. YAML extraction is optional. The frontend will:
- render the assistant message as-is;
- detect whether the response contains a skill YAML payload in a dedicated response field or parseable fenced block;
- if YAML is present and valid, offer or perform loading into the editable workspace;
- if YAML is missing or invalid, keep the chat response visible without mutating the current document.

Rationale:
- Not every assistant response should overwrite the workspace.
- Separating chat rendering from document loading makes failures easier to reason about.

Alternatives considered:
- Requiring every assistant response to contain YAML. Rejected because conversational clarification responses are still useful.
- Parsing only raw markdown text for YAML. Rejected as the sole mechanism because a dedicated response field is more robust.

### 4. Editing remains frontend-owned and local-only

After a YAML document is loaded, all graph edits, inspector edits, and document validation remain in the frontend. No save API is introduced in this change.

Rationale:
- It keeps the product simple and aligned with the stated requirement of no persistence.
- It allows implementation to focus on the backend generation boundary and the YAML document model first.

Alternatives considered:
- Server-backed draft storage. Rejected as out of scope.
- Sending every edit back to the backend. Rejected as unnecessary complexity without collaboration or persistence.

### 5. Prototype-only execution flows should be demoted or removed from the primary UX

Mock execution currently communicates a capability the product does not yet actually provide. During implementation, execution-related UI should either be clearly labeled as non-production simulation or removed from the main path until a real execution story exists.

Rationale:
- The product boundary should be honest.
- Real generation plus local editing is already a substantial scope.

Alternatives considered:
- Keeping mock execution unchanged. Rejected because it muddies the meaning of “real product.”

## Risks / Trade-offs

- [YAML/model drift] -> Use a single parse/serialize layer with schema validation and round-trip tests.
- [LLM responses may contain malformed YAML] -> Treat YAML loading as optional, surface parse errors in UI, and keep assistant text visible even when document extraction fails.
- [Frontend state model may still reflect prototype assumptions] -> Refactor state around a document adapter boundary instead of calling local generator helpers directly.
- [Users may expect documents to persist] -> Make the no-persistence behavior explicit in the UI and proposal scope.
- [Execution UI may imply unsupported capabilities] -> De-scope or relabel it during implementation.

## Migration Plan

1. Introduce a backend service and shared API contract for chat completion plus optional YAML payloads.
2. Replace frontend calls to the local generator with API requests.
3. Add YAML parsing/serialization and a document adapter between YAML and the in-memory editor model.
4. Update the chat panel to display backend messages and load extracted YAML into the workspace.
5. Remove or demote prototype-only flows that no longer represent the product boundary.
6. Verify that a user can start from an empty workspace, request a skill, receive YAML, load it, edit it locally, and continue chatting with the current YAML as context.

## Open Questions

- Should the backend return YAML in a dedicated `skillYaml` field, in assistant markdown code fences, or both?
- Should the frontend auto-load valid returned YAML, or require an explicit user action to avoid accidental overwrite?
- How much of the current execution panel should remain visible if execution is not yet real?
- Should the YAML document schema preserve the existing graph structure verbatim, or be reshaped into a cleaner product-facing format during this transition?
