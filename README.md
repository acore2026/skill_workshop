# Skill Workshop

Skill Workshop is a browser-based workbench for designing Markdown-defined agent skills and inspecting how those skills fit into a 6G core-network workflow. It combines a visual workflow editor, a read-only network topology, and a live execution console in one React application.

This repository contains the frontend. The API and agent runtime were moved to a separate repository and must be started independently.

## Main views

| Route | View | Purpose |
| --- | --- | --- |
| `/` | Architecture | Browse the 6G network topology and inspect network functions. |
| `/workshop` | Workshop | Build a skill as a graph, edit its properties, and keep the Markdown representation in sync. |
| `/execution` | Execution | Submit an intent and inspect routing decisions, agent output, and packet-style events. |

The Workshop treats the graph and the skill Markdown as two representations of the same document. Graph changes regenerate Markdown immediately; Markdown returned by the backend is parsed back into the graph.

## Requirements

- Node.js 24 or newer
- npm 11 or newer
- A compatible Skill Workshop backend for tool loading, skill discovery, generation, and execution

## Local setup

Install the frontend dependencies:

```bash
npm ci
```

The frontend defaults to an API on port `8080`. Add a `.env.local` file when the backend uses another address:

```dotenv
VITE_API_PORT=8080
VITE_API_BASE_URL=http://127.0.0.1:8080/api
VITE_WS_BASE_URL=ws://127.0.0.1:8080/ws
```

`VITE_API_BASE_URL` takes precedence over `VITE_API_PORT`. When `VITE_WS_BASE_URL` is omitted, the shared API client derives a WebSocket URL from the HTTP base URL.

Start the development server:

```bash
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm test` | Run the Node-based unit tests. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run build` | Type-check the application and create a production bundle. |
| `npm run preview` | Serve the production bundle locally. |

The `npm run api` script and the current `Dockerfile` still refer to the removed `backend/` directory. They are retained from the earlier single-repository layout and do not provide a working standalone backend build.

## Backend contract

The frontend expects these HTTP resources beneath the configured API base URL:

- `GET /health` for backend availability
- `GET /tools` for the tool catalog
- `GET /skills` for the skill library

Generation and execution use `${VITE_WS_BASE_URL}/agent-run`. The Workshop sends `start_run` messages and consumes run/session events. The Execution view sends `execute_intent` messages and consumes routing, agent-output, packet, and completion events.

There is currently no authentication layer in the frontend contract. Do not expose a development backend directly to an untrusted network.

## Project layout

```text
src/app/                  Route-level pages
src/components/           Shared shell and controls
src/features/             Workshop, topology, execution, and navigation UI
src/lib/                  API client, graph transforms, and Markdown adapters
src/schemas/              Zod schemas for skill documents
src/store/                Zustand application state
test/                     Unit tests for graph, Markdown, events, and store behavior
configs/tools.json        Reference tool catalog
doc/                      Design notes and skill-format documentation
openspec/                 Archived change proposals and behavior specifications
```

The detailed implementation design is in [doc/software-design.md](doc/software-design.md).

## Development notes

- Keep graph and Markdown conversion deterministic. Structural validation and tool grounding belong in code, not in model prompts.
- Treat `configs/tools.json` as a reference catalog; runtime data is loaded from the backend.
- UI layout preferences are stored in `localStorage`. Skill documents, execution output, and chat state are otherwise held in memory.
- The architecture view is intentionally read-only and uses static topology data from `src/lib/architectureData.ts`.
- Make focused commits and run the relevant tests before committing, as described in `AGENT.md`.

