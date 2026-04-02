# Generative Process Dashboard MVP Plan

## Product Summary

Build a greenfield `Vite + React + TypeScript` application for a generative-process dashboard with a two-pane workspace:

- Left pane: prompt/chat workspace that turns user intent into a draft skill graph.
- Right pane: graph orchestration dashboard for editing, validating, and mock-running the generated process.
- v1 flow: `user intent prompt -> generated skill graph -> human-in-the-loop editing -> mock sandbox run`.
- Visual direction: clean white product UI with restrained grayscale structure, soft cyan/blue telemetry accents, thin topology/grid cues, and high readability.

This document replaces the earlier `Next.js` direction. The first MVP is client-side only and uses mocked generation plus mocked execution so the UX and data model can be built before backend integration.

## MVP Outcome

The first MVP is complete when a user can:

1. Enter a prompt in the left pane.
2. Generate a draft graph from mocked logic.
3. Edit nodes, edges, and node parameters in the right pane.
4. Validate the graph and see actionable warnings or errors.
5. Run a simulated execution and inspect node-by-node progress, logs, and summary output.
6. Import or export the graph as YAML while keeping JSON as the canonical in-app format.

## Technical Decisions

### App Stack

- `Vite`
- `React`
- `TypeScript`
- `React Router` for a single main workspace route
- `Zustand` for editor and execution state
- `React Flow` for graph editing
- `Zod` for schemas and validation
- `yaml` package for import/export
- `Monaco Editor` or a lightweight code editor wrapper for JSON/YAML inspection

### Architecture Decisions

- Use a client-rendered SPA instead of SSR.
- Keep `SkillDocument` JSON as the single source of truth.
- Treat YAML as an import/export layer only.
- Keep graph generation mocked in v1 but deterministic enough for testing.
- Keep sandbox execution mocked in v1 with staged node transitions and logs.
- Defer authentication, persistence backend, collaboration, and real tool execution.

### UI Decisions

- Use a bright white base with soft off-white secondary surfaces.
- Prefer thin borders and spacing hierarchy over heavy cards and shadows.
- Use accent color sparingly for active, running, and selected states.
- Reserve monospace styling for telemetry, logs, identifiers, and structured data.
- Default layout should feel product-grade and quiet, not dark, playful, or futuristic-noisy.

## Core Interfaces

### Prompt Submission

`PromptSubmission -> SkillGenerationResponse`

- `PromptSubmission`
  - `prompt: string`
  - `context?: string`
- `SkillGenerationResponse`
  - `document: SkillDocument`
  - `assumptions: string[]`
  - `generationSummary: string`

### Skill Document

`SkillDocument` is the canonical runtime and editor model.

- `meta`
  - `id`
  - `title`
  - `description`
  - `version`
  - `createdAt`
  - `updatedAt`
- `promptContext`
  - `originalPrompt`
  - `generationNotes`
  - `assumptions`
- `nodes`
  - `id`
  - `type`
  - `label`
  - `position`
  - `config`
  - `inputs`
  - `outputs`
  - `ui`
- `edges`
  - `id`
  - `source`
  - `target`
  - `sourceHandle`
  - `targetHandle`
  - `condition`
- `layout`
  - `viewport`
  - `grouping`
- `validation`
  - `errors`
  - `warnings`
  - `lastValidatedAt`
- `execution`
  - `lastRun`
  - `nodeStatuses`
  - `timeline`

### YAML Transform

`SkillDocument <-> YAML`

- Import parses YAML into `SkillDocument`.
- Export serializes current `SkillDocument` into YAML.
- Validation runs after import before document becomes active.

### Mock Sandbox

`MockSandboxRunRequest -> MockSandboxRunResult`

- `MockSandboxRunRequest`
  - `document: SkillDocument`
- `MockSandboxRunResult`
  - `status`
  - `timelineEntries`
  - `nodeResults`
  - `summary`

## v1 Node Types

Support these node types in the first MVP:

- `intent`
- `planner`
- `tool`
- `router`
- `validator`
- `formatter`
- `output`

Each node type needs:

- a visible label and icon treatment
- typed config fields in the inspector
- input and output handle definitions
- mock execution behavior
- validation rules for required fields

## App States

The workspace should explicitly support these states:

- `idle`
- `generating`
- `draft_ready`
- `editing`
- `validating`
- `ready_to_run`
- `mock_running`
- `run_complete`
- `error`

These states should drive UI feedback across the prompt panel, graph canvas, validation area, and run controls.

## Detailed Implementation Stages

### Stage 1: Foundation And Project Setup

Goal: create the baseline Vite app, shared structure, and tooling.

Implementation steps:

1. Initialize `Vite + React + TypeScript`.
2. Add routing with a primary `/` route for the workspace.
3. Create folders for:
   - `src/app`
   - `src/components`
   - `src/features/prompt`
   - `src/features/graph`
   - `src/features/inspector`
   - `src/features/execution`
   - `src/store`
   - `src/schemas`
   - `src/mocks`
   - `src/theme`
   - `src/utils`
4. Add baseline linting and formatting configuration.
5. Install and wire the core libraries.
6. Build a top-level page shell with header, left pane, right pane, and optional lower panel.

Checklist:

- [ ] Vite app boots locally
- [ ] TypeScript strict mode is enabled
- [ ] Main route renders workspace scaffold
- [ ] Core folders and naming conventions are in place
- [ ] Shared app shell exists with placeholder panes
- [ ] No framework references to `Next.js` remain

### Stage 2: Theme And Design System

Goal: define the clean white UI language before building complex interactions.

Implementation steps:

1. Create theme tokens for:
   - page background
   - panel surfaces
   - borders
   - text hierarchy
   - accent color
   - semantic statuses
2. Add global CSS variables.
3. Build primitive components:
   - `Button`
   - `Input`
   - `Textarea`
   - `Panel`
   - `Tabs`
   - `Badge`
   - `StatusPill`
   - `EmptyState`
4. Add subtle background treatments such as a light grid, faint topology lines, or a restrained noise texture.
5. Define loading, selected, running, and error visual states.

Checklist:

- [ ] Global theme tokens are centralized
- [ ] App uses a white-first visual system consistently
- [ ] Primitive components are reusable and consistent
- [ ] Focus states and contrast are accessible
- [ ] Decorative effects remain subtle and do not reduce clarity

### Stage 3: Schema, Store, And Mock Data Layer

Goal: establish the data model and state management before feature UI work.

Implementation steps:

1. Define `Zod` schemas for:
   - `SkillDocument`
   - nodes
   - edges
   - validation result
   - execution result
2. Create typed factories:
   - `createEmptyDocument`
   - `createDraftFromPrompt`
   - `serializeToYaml`
   - `parseFromYaml`
3. Create a Zustand store for:
   - active document
   - selected node or edge
   - current app state
   - validation results
   - execution state
4. Build deterministic mocked generation logic:
   - accept prompt text
   - infer a graph template
   - populate starter nodes and edges
   - attach assumptions
5. Build graph validation rules:
   - required start and output nodes
   - missing required config
   - invalid or dangling edges
   - unsupported cycle detection for v1

Checklist:

- [ ] Canonical schema covers all MVP data
- [ ] Store actions exist for node, edge, and document updates
- [ ] Prompt can generate a draft graph
- [ ] Validation returns structured warnings and errors
- [ ] YAML roundtrip works for valid documents

### Stage 4: Left Pane Prompt Workspace

Goal: deliver the generative entry point for the dashboard.

Implementation steps:

1. Build prompt composer UI with main textarea and action buttons.
2. Build a conversation or activity feed showing:
   - prompt submitted
   - generation progress
   - generation summary
   - assumptions
3. Add actions for:
   - generate graph
   - regenerate graph
   - reset workspace
   - import YAML
   - export YAML
4. Represent generation progress in staged language:
   - interpreting prompt
   - drafting nodes
   - wiring graph
   - validating draft
5. Keep prompt history for the current browser session.

Checklist:

- [ ] User can submit a prompt
- [ ] Left pane shows generation lifecycle clearly
- [ ] Assumptions and summaries are visible
- [ ] Import and export actions are reachable
- [ ] Empty, loading, success, and error states are covered

### Stage 5: Right Pane Graph Editor

Goal: implement the orchestration dashboard itself.

Implementation steps:

1. Integrate `React Flow` with the `SkillDocument` node and edge data.
2. Create custom node renderers for the v1 node types.
3. Support core interactions:
   - add node
   - delete node
   - drag node
   - connect nodes
   - reconnect edges
   - select node or edge
4. Add graph actions:
   - fit view
   - validate graph
   - reset layout
5. Surface graph-level health summary above the canvas.

Checklist:

- [ ] Graph renders from store data
- [ ] Editing interactions work without breaking state sync
- [ ] Node selection is reflected in the inspector
- [ ] Validation state is visible from the canvas view
- [ ] Canvas remains usable at standard laptop widths

### Stage 6: Inspector And Property Editing

Goal: make the graph editable beyond topology.

Implementation steps:

1. Build an inspector panel for selected nodes and edges.
2. Allow editing of:
   - label
   - description
   - node type
   - config fields
   - input/output metadata
   - edge conditions
3. Show validation messages directly in the inspector.
4. Reflect changes immediately in the graph canvas and store.

Checklist:

- [ ] Selecting a node opens the correct inspector state
- [ ] Config edits are typed and validated
- [ ] Edge properties can be edited where applicable
- [ ] Validation messages are actionable and local to the edited item

### Stage 7: Mock Sandbox Execution

Goal: simulate execution so the MVP demonstrates behavior, not just structure.

Implementation steps:

1. Add run controls:
   - run mock sandbox
   - reset run
   - optional step replay
2. Build mocked execution traversal:
   - determine logical node order
   - move nodes through pending, running, success, skipped, and error states
   - emit timeline entries
   - attach synthetic outputs
3. Add an execution panel for:
   - timeline
   - active node
   - log stream
   - summary metrics
4. Persist last run state within the document store.

Checklist:

- [ ] Mock run can start from a valid graph
- [ ] Node states update visibly during execution
- [ ] Timeline and logs are readable
- [ ] Reset returns the run state to idle
- [ ] Summary persists until the next run or reset

### Stage 8: Responsive MVP Polish

Goal: make the first release usable across desktop and smaller screens.

Implementation steps:

1. Define layout behavior for:
   - desktop two-pane view
   - tablet with collapsible inspector or logs
   - mobile with tabbed sections
2. Add lightweight persistence using `localStorage` for the active document.
3. Add keyboard shortcuts for common actions such as validate, run, and delete.
4. Improve empty states and helper text.

Checklist:

- [ ] Desktop layout is stable
- [ ] Tablet layout keeps the main flows usable
- [ ] Mobile can at least inspect and navigate the graph flow
- [ ] Local draft persists between reloads
- [ ] Shortcut and focus behavior are acceptable

## First MVP Build Order

Follow this order to reach a usable first MVP quickly:

1. Stage 1 Foundation
2. Stage 2 Theme
3. Stage 3 Schema and Store
4. Stage 4 Prompt Workspace
5. Stage 5 Graph Editor
6. Stage 6 Inspector
7. Stage 7 Mock Execution
8. Stage 8 Polish

If time is constrained, the minimum shippable cut is:

- basic app shell
- prompt submission
- mocked graph generation
- graph rendering
- node selection and inspector editing
- graph validation
- mock execution timeline

The following can slip after the first MVP if necessary:

- mobile-specific polish beyond basic usability
- advanced node types
- step replay controls
- richer background visuals
- deeper prompt history features

## Testing Plan

### Unit Tests

- Validate `SkillDocument` schema parsing.
- Validate YAML import and export behavior.
- Validate graph rule checks for required nodes and configs.
- Validate mocked execution ordering and status transitions.

### Integration Tests

- Prompt submission generates a document and populates the graph.
- Editing inspector fields updates the graph and store.
- Invalid graph configuration blocks ready-to-run state.
- Running a valid graph updates timeline and node statuses.

### Manual QA Scenarios

- Start from a blank workspace.
- Generate a graph from a prompt like low-latency gaming orchestration.
- Delete a required edge and verify validation feedback.
- Import malformed YAML and confirm the error is understandable.
- Export a valid graph and re-import it successfully.
- Resize to tablet and mobile widths and confirm key workflows remain available.

Checklist:

- [ ] Unit tests cover schema and utility logic
- [ ] Integration tests cover main editor flows
- [ ] Invalid input paths are handled cleanly
- [ ] Responsive behavior is manually verified

## Acceptance Criteria

- User can enter a prompt and receive a draft graph with no backend dependency.
- User can edit nodes, edges, and configuration values.
- User can validate the graph and understand why it is blocked or ready.
- User can run a mock execution and inspect progress, logs, and outputs.
- User can import and export YAML successfully.
- The application clearly reflects a clean, white, modern workspace rather than a dark or visually noisy UI.

## Out Of Scope For MVP

- Real LLM-backed generation
- Real tool or agent execution
- Server persistence
- Authentication and authorization
- Multi-user collaboration
- Version history and branching
- Production observability and analytics

## Default Assumptions

- This repository is greenfield and has no UI constraints to preserve.
- Primary users are technical operators, solution engineers, or workflow designers.
- JSON remains canonical inside the app even when YAML is displayed to the user.
- Graph cycles are not fully supported in v1 and should be flagged during validation unless intentionally modeled later.
- The first MVP prioritizes clarity, structure, and editability over backend realism.
