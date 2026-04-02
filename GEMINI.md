# GEMINI.md - Skill Workshop (neocore_2)

## Project Overview
The Skill Workshop is a development environment for designing and generating AI agent "skills." It combines a visual graph editor with an automated agent pipeline to produce structured Markdown skill documents.

### Architecture
- **Frontend:** React (TypeScript) powered by Vite.
  - **Graph Editor:** Built with `@xyflow/react` for visual workflow modeling.
  - **State Management:** Zustand (`src/store/useStore.ts`).
  - **UI Components:** Framer Motion for animations, Lucide for icons, and Monaco Editor for real-time Markdown previews.
- **Backend:** Go-based API server.
  - **Agent Pipeline:** A multi-stage process (Planner -> Composer -> Validator) that transforms user prompts into validated Markdown skills.
  - **Transport:** WebSocket-based streaming for real-time generation updates.
  - **Tool Catalog:** Driven by a central `configs/tools.json` file.

## Building and Running

### Prerequisites
- Node.js (v24+ recommended for experimental test support)
- Go (v1.26+)

### Key Commands
- **Start Frontend:** `npm run dev`
- **Start Backend API:** `npm run api`
- **Build All:** `npm run build`
- **Lint:** `npm run lint`
- **Frontend Tests:** `npm run test`
- **Backend Tests:** `npm run test:go`

## Development Conventions

### Agent Workflow (Mandatory)
Adhere to the rules in `AGENT.md`:
1. **Incremental Commits:** Commit immediately after every bugfix or feature implementation.
2. **Atomic Changes:** Do not batch unrelated changes into a single commit.
3. **Validation:** Run relevant tests (frontend or backend) before committing.

### Skill Document Standards
Skills are authored as Markdown files following the spec in `doc/md/agent_plan.md`:
- **Format:** Markdown with YAML front matter.
- **Workflow Section:** Must contain a YAML block (not pseudocode).
- **No Parameter Wiring:** The system specifically avoids explicit data-link or parameter-handle logic.
- **Tool Grounding:** Every tool used must exist in `configs/tools.json`.

### Architecture Patterns
- **Frontend-Backend Sync:** The graph editor in the frontend is the primary source of truth for the workflow process. Edits trigger real-time Markdown updates. Backend-generated Markdown can be imported back into the graph.
- **Rule-Based Validation:** Prefer deterministic code-based validation for structure and tool grounding over LLM-based "vibe" checks.

## Key Files & Directories
- `configs/tools.json`: Canonical tool catalog.
- `doc/md/agent_plan.md`: Core architectural plan for the Markdown-skill workflow.
- `backend/server/`: Core backend logic, including the agent runtime and WebSocket handlers.
- `src/features/graph/`: Frontend graph editor implementation.
- `src/lib/skillMarkdown.ts`: Logic for converting between graph state and Markdown.
- `AGENT.md`: Agent-specific workflow instructions.
- `PLAN.md`: Current project roadmap and checklist.
