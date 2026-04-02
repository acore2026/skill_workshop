# Markdown Skill Workflow Rewrite

## Summary

Replace the current graph/YAML skill system with the markdown-skill workflow system defined in `doc/md/agent_plan.md`.

Chosen defaults:
- Keep the graph editor as the main workflow editor.
- Add a real-time markdown preview generated from the graph.
- Keep planner IR hidden from normal UI.
- Show the dynamic tool catalog in an inline drawer.
- Use real tool nodes plus explicit control nodes in the graph.
- Remove parameter wiring completely from backend logic, frontend schema, and UI.

## Checklist

### 1. Backend Agent Pipeline
- [x] Add a deterministic input normalizer that loads `configs/tools.json` at run start.
- [x] Normalize the raw user prompt into a planner-ready prompt context.
- [x] Normalize the tool catalog into a canonical searchable tool index.
- [x] Replace the current package/YAML-draft workflow with a planner agent that outputs only YAML IR.
- [x] Make the planner follow the exact output schema from `doc/md/agent_plan.md`.
- [x] Add a rule-based planner validator for tool grounding, order, abort continuity, and required fields.
- [ ] Add targeted planner repair when the planner validator fails.
- [x] Add a composer agent that converts planner YAML into the final markdown skill document.
- [x] Make the composer preserve planner logic exactly and use the exact markdown section order from the design doc.
- [x] Add a rule-based markdown validator for front matter, section order, tool inventory/workflow consistency, completion states, and no parameter wiring.
- [ ] Add targeted composer repair when the markdown validator fails.
- [x] Remove the current package-install stage from the main product flow.
- [x] Remove the current YAML-skill draft generation prompts from the main product flow.

### 2. Backend Runtime and Interfaces
- [x] Keep WebSocket streaming as the main generation transport.
- [x] Stream planner/composer progress as assistant text or status events.
- [x] Stream the final markdown skill artifact as the authoritative generation result.
- [x] Stop sending YAML-skill artifact events in the new markdown workflow path.
- [x] Add a backend endpoint or socket payload support for the normalized tool catalog so the frontend can display the same real tools the agent uses.
- [x] Ensure `configs/tools.json` is the only runtime source of tool definitions.

### 3. Workflow Domain Model
- [x] Replace the current card schema with a workflow schema centered on process editing.
- [x] Add `ToolStepNode` support for nodes that reference real tools from the loaded catalog.
- [x] Add `ControlNode` support for workflow control nodes such as gate, branch, abort, and done.
- [x] Remove input/output/next-action port concepts from the workflow model.
- [x] Remove data-link and parameter-handle logic from the graph model.
- [x] Replace YAML-skill document state with markdown-skill document state in the frontend store.
- [x] Add a markdown skill document model with front matter, overview, tool inventory, workflow YAML block, critical rules, and output format.

### 4. Frontend Workspace Simplification
- [x] Keep the graph editor as the main workflow process editor.
- [x] Add a real-time markdown preview pane that updates from graph edits.
- [x] Remove parameter/data editing UI from the graph editor.
- [x] Remove redundant windows, tabs, and controls that only exist for YAML artifacts, parameter editing, or execution traces.
- [x] Keep the chat panel for streamed agent interaction.
- [x] Keep a compact inspector for selected workflow node and edge metadata only.
- [x] Add an inline tools drawer that shows the dynamic tool catalog from `configs/tools.json`.
- [x] Remove quick-add items for constants, data containers, and other non-workflow cards.
- [x] Replace quick-add options with real tool nodes and explicit control nodes.

### 5. Frontend Conversions and Sync
- [x] Add graph workflow -> markdown preview conversion.
- [x] Add backend markdown -> graph import/update conversion.
- [x] Add tool catalog JSON -> normalized frontend tool metadata conversion.
- [x] Keep backend-generated markdown able to replace the current graph-derived document after successful parse/import.
- [x] Preserve the current workflow if backend markdown is invalid.
- [x] Surface markdown parse/import errors clearly in the UI.

### 6. Tool Catalog UI
- [x] Load the tool catalog dynamically from backend-backed normalized data.
- [x] Show tool name, description, and parameter metadata in the inline drawer.
- [x] Make the drawer searchable.
- [x] Make the drawer clearly read-only so it is reference material, not a second editor.
- [x] Ensure the tool set shown in the drawer matches the tool set provided to the planner and validator.

### 7. Removed Behaviors
- [x] Remove parameter wiring from backend prompts and validators.
- [x] Remove parameter wiring from frontend graph rendering.
- [x] Remove YAML-skill preview/editor as the primary artifact surface.
- [x] Remove data-container-specific editing behavior.
- [x] Remove SBI-specific configuration surfaces that are no longer relevant in the markdown-skill workflow editor.

### 8. Tests
- [x] Add backend tests proving the planner uses only tools present in `configs/tools.json`.
- [x] Add backend tests proving the planner emits valid YAML IR and no markdown.
- [x] Add backend tests proving the composer preserves planner order and section structure exactly.
- [x] Add backend tests for validator rejection of unknown tools, reordered workflows, missing completion states, and parameter wiring.
- [ ] Add backend tests for targeted planner repair and targeted composer repair.
- [x] Add frontend tests for graph edits updating the markdown preview immediately.
- [x] Add frontend tests for backend markdown importing back into the graph correctly.
- [ ] Add frontend tests proving removed parameter/data UI no longer appears.
- [ ] Add frontend tests for dynamic tool drawer rendering from backend-loaded catalog data.
- [ ] Add end-to-end tests for prompt -> streamed progress -> final markdown -> graph update -> live preview sync.
- [ ] Add end-to-end tests proving invalid backend markdown does not corrupt the current workflow.

## Assumptions

- [ ] `doc/md/agent_plan.md` is the source of truth for planner, composer, validator, and markdown structure.
- [x] The graph remains in the product, but only as a workflow-process editor.
- [x] Planner IR stays hidden in normal UI.
- [x] The tool catalog is shown in an inline drawer.
- [x] Control nodes are explicit in the graph.
- [x] Parameter wiring is fully removed, not just hidden.
