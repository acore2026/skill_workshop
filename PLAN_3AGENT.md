# Rebuild Backend to a 3-Agent Intent/Writer/Checker Pipeline

## Summary

Replace the current 2-agent `planner -> composer` backend with a 3-agent pipeline aligned to the new product requirement while keeping the existing ADK runner + WebSocket transport.

Chosen decisions:
- `intent_analysis_agent` output is shown as normal chat messages, not hidden behind the Thinking section
- `markdown_format_checker_agent` automatically rewrites until valid with a bounded retry policy
- domain categories are fixed to `ACN`, `QoS`, and `Computation`
- only `ACN` has real domain knowledge initially; `QoS` and `Computation` use empty knowledge placeholders
- the frontend must no longer receive planner YAML as a visible first message

This supersedes the current backend shape in `backend/server/adk_agents.go` and `backend/server/adk_state.go`, which still emits planner YAML first.

## Key Changes

### 1. Agent architecture

- Replace the current agent chain with:
  - `intent_analysis_agent`
  - `skill_writer_agent`
  - `markdown_format_checker_agent`
- Keep a deterministic preprocessing step before the agents:
  - normalize prompt
  - load and normalize `configs/tools.json`
  - classify the request into `ACN | QoS | Computation`
  - load category-specific domain knowledge
- Agent responsibilities:
  - `intent_analysis_agent`
    - classify intent into one of the fixed categories
    - summarize user intent, success condition, likely workflow shape, and applicable domain knowledge
    - produce human-readable analysis for the chat UI
    - persist structured state for downstream agents
  - `skill_writer_agent`
    - generate the markdown skill document directly
    - use current markdown skill, normalized tool catalog, selected category, and loaded domain knowledge
    - follow the output structure from `doc/md/ACN_SKILL.md`
  - `markdown_format_checker_agent`
    - validate section order, front matter, workflow formatting, tool grounding, and consistency
    - if invalid, produce a corrected markdown document
    - repeat internally until valid or retry limit reached
- Remove planner YAML from the user-facing pipeline. Internal structured state may still exist, but it must not be emitted as the first visible assistant message.

### 2. Domain knowledge and intent classification

- Add a deterministic category layer in backend state/bootstrap:
  - `ACN`
  - `QoS`
  - `Computation`
- Domain knowledge source:
  - `ACN`: grounded from `doc/md/ACN_SKILL.md` plus any existing backend ACN knowledge helper
  - `QoS`: empty placeholder knowledge object
  - `Computation`: empty placeholder knowledge object
- Classification behavior:
  - prefer deterministic keyword/rule classification first
  - optionally let `intent_analysis_agent` confirm/refine the category, but final category must be one of the fixed enum values
- Persist these state keys for the run:
  - `intent_category`
  - `domain_knowledge_brief`
  - `intent_analysis_summary`
  - `writer_markdown_draft`
  - `checker_attempt_count`
  - `skill_markdown`
- The writer and checker must both consume the selected category and knowledge brief.

### 3. Backend runtime and streaming behavior

- Keep ADK runner + in-memory session architecture.
- Rebuild the sequential flow to:
  1. deterministic input normalization and category selection
  2. `intent_analysis_agent`
  3. `skill_writer_agent`
  4. `markdown_format_checker_agent`
  5. internal retry loop if checker fails
- Streaming contract:
  - visible normal chat messages from `intent_analysis_agent`
  - visible normal chat messages from `skill_writer_agent`
  - concise checker progress/status messages from `markdown_format_checker_agent`
  - only markdown artifacts from writer/checker should update the frontend document
- Checker retry behavior:
  - use bounded retries, default `max_attempts = 3`
  - on each failed check, send the checker findings plus prior markdown back into the checker agent
  - if still invalid after max attempts, emit `run_error` with the final checker failure summary
- The authoritative frontend artifact is the final checker-approved markdown, not the writer’s first draft unless it already passes.

### 4. Prompting and markdown contract

- Update prompts to match the new architecture:
  - `intent_analysis_agent`
    - classify request
    - explain why the category fits
    - summarize relevant tool subset and domain constraints
    - do not emit YAML or final markdown
  - `skill_writer_agent`
    - generate markdown directly
    - follow the structure and tone of `doc/md/ACN_SKILL.md`
    - adapt content to the actual request and selected category
    - do not emit hidden internal reasoning or YAML IR
  - `markdown_format_checker_agent`
    - validate and rewrite to the required structure
    - preserve workflow intent while fixing formatting/consistency issues
- Final markdown contract:
  - YAML front matter
  - `# {name} Skill`
  - `## Overview`
  - `## Tool Inventory`
  - `## Workflow`
  - `## Critical Rules`
  - `## Output Format`
- Workflow format:
  - keep the repo’s current ACN-style python pseudo-code block if that is now the product format
  - do not reintroduce planner YAML into the user-visible artifact
- Tool grounding:
  - all selected tools must come from `configs/tools.json`
  - tool descriptions may be tightened to help the writer choose better sequences

### 5. Frontend behavior and compatibility

- Preserve current chat UX behaviors:
  - streaming conversation
  - tool call / skill-install telemetry
  - markdown artifact application to workspace
- Update frontend event handling so:
  - first visible agent message is intent analysis, not YAML
  - markdown application only happens on writer/checker markdown artifact events
  - checker status appears as progress/status text rather than raw invalid markdown dumps
- Keep the existing collapsed Thinking support separate from visible chat messages. Since intent analysis is explicitly chosen to be visible, it should not be forced into the Thinking panel.
- No frontend workflow-editor schema change is required for this backend refactor, but the markdown importer must continue to accept the checker-approved markdown shape.

## Public APIs / Interfaces / Types

- Replace current agent/state naming:
  - remove `planner_agent`
  - remove `composer_agent`
  - add `intent_analysis_agent`
  - add `skill_writer_agent`
  - add `markdown_format_checker_agent`
- Replace backend state keys:
  - deprecate `planner_ir`
  - keep/add `intent_category`, `domain_knowledge_brief`, `intent_analysis_summary`, `writer_markdown_draft`, `skill_markdown`
- WebSocket event behavior:
  - keep `run_started`, `session_event`, `run_complete`, `run_error`
  - `session_event.author` must now be one of the three new agents
  - markdown artifact state must come from writer/checker stages only
- Validation/checker interface:
  - deterministic validation function returns `valid`, `issues[]`, and `repair_prompt`
  - checker agent consumes the invalid markdown plus validation issues to produce the next attempt

## Test Plan

- Backend unit tests
  - intent classifier maps representative prompts to `ACN`, `QoS`, and `Computation`
  - empty knowledge placeholders are returned for `QoS` and `Computation`
  - ACN knowledge is loaded from the repo reference path
  - checker validation rejects missing sections, wrong order, unknown tools, and malformed workflow blocks
  - checker retry loop stops on success or bounded failure
- Backend integration tests
  - `Connect a new embodied agent to the network subnet` classifies to `ACN`
  - first visible streamed message is intent analysis, not YAML
  - writer produces markdown
  - checker either passes or rewrites to valid markdown
  - final run completes with checker-approved markdown in state
- Frontend tests
  - streamed first message renders as visible analysis chat content
  - markdown workspace update only happens when markdown artifact arrives
  - checker progress does not overwrite main assistant messages
  - raw planner-style YAML never appears as the first assistant message in the ACN example path
- Acceptance scenarios
  - ACN prompt produces an ACN-like markdown skill aligned to `doc/md/ACN_SKILL.md`
  - QoS prompt classifies to `QoS`, uses empty placeholder knowledge, and still produces valid markdown
  - malformed writer draft is auto-corrected by the checker without user intervention
  - repeated checker failure surfaces a clear `run_error` without corrupting the current workspace

## Assumptions

- `doc/md/ACN_SKILL.md` is the style/template reference for final markdown output.
- `doc/md/agent_plan.md` is no longer the exact architecture source of truth because this plan intentionally adds a separate intent-analysis agent and an agent-based checker.
- The backend remains stateless and uses in-memory ADK sessions per run.
- `QoS` and `Computation` ship with empty domain knowledge in this phase; only the category plumbing is required now.
- The checker’s bounded auto-rewrite default is 3 attempts unless implementation constraints require 2, in which case that limit should be documented in code and tests.
