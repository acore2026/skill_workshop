# UE5-Style Card + Line Workspace Replication Spec

## 1. Purpose

This document specifies a workspace UI that reproduces the core interaction model and visual grammar of Unreal Engine 5's graph-based editors, especially Blueprint, Material, and Niagara style workflows.

The goal is **not** to clone UE5 pixel-for-pixel. The goal is to replicate the **workspace architecture**, **node/wire interaction model**, **layout rules**, **selection behavior**, **editing patterns**, and **supporting panels** so that a user immediately recognizes the experience as a UE5-like graph editor.

This spec is intended for implementation by an autonomous coding agent.

---

## 2. Product Goal

Build a node-based editor workspace where:

* users compose logic visually using cards (nodes) and wires (connections)
* the canvas is spatial, pannable, and zoomable
* cards expose typed inputs and outputs through pins
* wires communicate data flow, control flow, or dependency flow
* a right-hand inspector edits the selected object
* a left-hand library/outliner helps with navigation and creation
* graph readability is a first-class feature, not an afterthought

The workspace must feel:

* professional
* tool-like rather than consumer-app-like
* dense but readable
* interactive with low-friction editing
* optimized for long sessions and large graphs

---

## 3. Design Principles

### 3.1 Spatial logic over form-based logic

The graph is the primary interface. Users think by arranging and connecting blocks in 2D space.

### 3.2 Node = unit of meaning

Each card should represent one semantic unit:

* event
* action
* expression
* parameter
* branch
* group
* IO endpoint
* module

### 3.3 Pin = interface

Pins are the contract of each node. A node should be understandable from its visible pins and title alone.

### 3.4 Wire = relationship

Wires are not decoration. They visually encode:

* execution order
* data dependency
* signal propagation
* ownership/reference

### 3.5 Details are externalized

UE5 style editors keep node faces compact and move deep configuration into the Details panel.

### 3.6 Graph readability is part of the feature set

Alignment, comment boxes, reroutes, node spacing, and wire cleanliness must be built in from day one.

### 3.7 Progressive disclosure

Only reveal the controls needed at the current level:

* node header always visible
* pins visible when relevant
* advanced properties in inspector
* debug/state overlays on demand

---

## 4. High-Level Workspace Layout

Use a 3-pane desktop layout.

### 4.1 Top toolbar

Persistent horizontal toolbar for global actions.

Required actions:

* save
* undo / redo
* search
* run / simulate / test
* auto layout
* zoom to fit
* validate graph
* open settings

Optional:

* compile
* publish
* version indicator
* environment badge
* live status indicator

### 4.2 Left panel

A collapsible navigation/library panel.

Modes:

1. **Outline mode**

   * graph list
   * subgraph list
   * variables/resources
   * reusable components
2. **Library mode**

   * searchable node catalog
   * grouped by category
   * drag-to-canvas support

Width: 260–320px default.
Resizable.

### 4.3 Center graph canvas

The main workspace.

Features:

* infinite or virtually infinite canvas
* background grid
* pan and zoom
* node placement
* wire rendering
* marquee selection
* comment/group regions
* context menu spawning

This is the most important area and should receive most rendering/performance attention.

### 4.4 Right panel (Details / Inspector)

Context-sensitive inspector for selected item.

Selection targets:

* node
* connection
* comment group
* graph background
* multiple nodes

Contents vary by selection, but should generally include:

* title / object name
* category / type
* editable properties
* advanced properties
* validation state
* debug state

Width: 300–380px default.
Resizable.

### 4.5 Bottom panel (optional but recommended)

Tabbed utility area.

Suggested tabs:

* log
* validation errors
* search results
* execution trace
* test output
* variable watch

Default collapsed.

---

## 5. Core Object Model

### 5.1 Graph

A graph is a document or subdocument containing nodes and edges.

Graph fields:

* id
* name
* type
* nodes[]
* edges[]
* groups[]
* viewport state (pan, zoom)
* metadata
* version

Graph types:

* root graph
* subgraph
* function graph
* material graph style computation graph
* event graph
* test graph

### 5.2 Node

A node is a rectangular card-like block placed on the canvas.

Minimum fields:

* id
* type
* title
* subtitle (optional)
* position {x, y}
* size {w, h}
* inputs[]
* outputs[]
* properties
* uiState
* validationState

### 5.3 Pin

Pins belong to nodes.

Minimum fields:

* id
* nodeId
* direction: input | output
* name
* dataType
* pinKind: execution | data | event | trigger | reference
* multiplicity: single | multiple
* optional: boolean
* defaultValue
* ui metadata

### 5.4 Edge

An edge connects one output pin to one input pin.

Minimum fields:

* id
* fromNodeId
* fromPinId
* toNodeId
* toPinId
* edgeType
* label (optional)
* style metadata

### 5.5 Group / Comment Region

A spatial container that improves readability.

Fields:

* id
* title
* rect
* color/style token
* child node ids
* collapsed state (optional)

---

## 6. Node Taxonomy

To reproduce the UE5 feel, implement distinct node classes with clearly different semantics.

### 6.1 Entry nodes

Examples:

* Start
* On User Prompt
* On Event
* On Tick / Update

Rules:

* no incoming execution pins
* visually stable anchor point
* typically placed toward left/top of graph

### 6.2 Action nodes

Examples:

* Call Tool
* Send Request
* Run Model
* Write State

Rules:

* one execution input, one execution output by default
* may also expose data pins

### 6.3 Branch / decision nodes

Examples:

* If
* Switch
* Route by Type

Rules:

* one execution input
* multiple execution outputs
* at least one condition input

### 6.4 Pure data / expression nodes

Inspired by Blueprint pure functions and Material nodes.

Examples:

* Format Prompt
* Merge Inputs
* Compute Score
* String Template

Rules:

* no execution pins if pure
* only data pins
* should be visually compact

### 6.5 Parameter / constant nodes

Examples:

* Number
* String
* Config
* Threshold
* Model Selection

Rules:

* may have only output pins
* easy inline editing

### 6.6 Output / terminal nodes

Examples:

* Final Response
* Tool Result
* Material Output style node
* Test Verdict

Rules:

* mostly incoming pins only
* often visually emphasized

### 6.7 Container / subgraph nodes

Examples:

* Skill Module
* Function
* Reusable Block

Rules:

* double-click to open nested graph
* ports represent subgraph interface

### 6.8 Annotation nodes

Examples:

* Note
* Warning
* TODO

Rules:

* not executable
* no wires required

---

## 7. Visual Language

## 7.1 Canvas

### Background

* dark theme by default
* subtle grid with minor and major divisions
* no visually loud textures
* grid contrast low enough not to distract

### Recommended tokens

* canvas background: very dark charcoal
* minor grid: faint neutral line
* major grid: slightly brighter neutral line
* selection accent: cool bright tone

### Behavior

* grid scales appropriately during zoom
* major grid remains perceptible at medium zoom

## 7.2 Nodes as cards

Node card anatomy:

1. outer container
2. header row
3. optional subtitle / metadata row
4. body area
5. left/right pin rails
6. status indicators

### Card style

* rectangular with mild radius, not overly rounded
* high contrast from background
* subtle border
* slightly raised via shadow/glow only when selected/hovered
* title text medium weight

### Header

The header should communicate type quickly.

Header contains:

* node title
* optional icon
* optional category badge
* optional collapse toggle

UE-like behavior to emulate:

* type or semantic class is identifiable at a glance
* header color can encode category, but should not overpower

## 7.3 Pins

Pins must be small but highly legible.

### Shape recommendations

* execution pins: wedge/arrow or distinct shape
* data pins: circular
* event pins: diamond or stylized circle

### Placement

* inputs on left
* outputs on right
* vertically aligned to labels

### Pin label rules

* label visible by default for standard nodes
* label may collapse for compact nodes at low zoom
* pin labels truncate gracefully

### Pin states

* idle
* hover
* compatible target highlight
* connected
* invalid target
* disabled

## 7.4 Wires

Wire rendering is critical to the UE5-like feeling.

### Style

* curved bezier/spline, not straight orthogonal lines by default
* line thickness moderate
* anti-aliased
* flows naturally from output to input

### Semantics

Different wire types should be distinguishable by color and/or shape:

* execution wire
* data wire
* event/signal wire
* error/invalid placeholder wire

### Interaction states

* hover highlight
* selected glow
* drag-preview wire while connecting
* animated flow on execution playback (optional but highly recommended)

### Layout behavior

* route with enough curvature to reduce visual harshness
* maintain stable paths when possible during drag/move

## 7.5 Color system

Use color sparingly and semantically.

Recommended mapping:

* execution/control nodes: warm accent or neutral with distinct exec pins
* data transform nodes: cool accent
* input/parameter nodes: green-ish or softer accent
* output/result nodes: gold or emphasized neutral
* warning/error state: amber/red overlays only when needed

Do not make every node brightly colored. UE5 style relies on a dark neutral base with controlled category signaling.

## 7.6 Typography

* compact sans serif
* title 12–14px semibold
* body 11–12px
* metadata 10–11px
* maintain legibility over density

## 7.7 Icons

Icons should support scanning but not dominate.
Use simple line icons for:

* search
* play/test
* warning/error
* collapse/expand
* graph/module/function
* settings

---

## 8. Interaction Model

## 8.1 Navigation

### Pan

* middle mouse drag or space + left drag
* trackpad pan support

### Zoom

* mouse wheel centered on cursor
* pinch on trackpad
* zoom bounds, e.g. 20%–200%

### Focus shortcuts

* frame selection
* frame all
* jump to search result

## 8.2 Node creation

Support 3 creation modes.

### Mode A: context menu on canvas

* right click or hotkey opens searchable action menu
* typing filters node types
* selecting a node spawns it at cursor

This is essential to the UE-like workflow.

### Mode B: drag from left library

* drag item from node library to canvas

### Mode C: drag from pin to open compatible-node menu

* drag from an unconnected pin and release on empty canvas
* show filtered menu of compatible nodes
* auto-connect newly created node

This is a major quality-of-life behavior and should be treated as a core feature.

## 8.3 Selection

### Single select

* click node
* shows resize handles only if needed
* loads details panel

### Multi-select

* shift-click
* marquee drag

### Selection rules

* clicking empty canvas clears selection
* selection box should include only top-level selected nodes unless group mode is active

## 8.4 Dragging nodes

* drag by header or body
* preserve relative offsets for multi-select drag
* wires update live during drag
* optional snap-to-grid

## 8.5 Connecting pins

### Flow

1. hover pin
2. click-drag to start preview wire
3. hover target pins, highlight compatible ones
4. release to connect

### Validation rules

* input/output directions must be compatible
* data types must match or be coercible
* multiplicity rules enforced
* cycles blocked if graph type disallows cycles

### Failure UX

* invalid targets visibly reject the wire
* optional tooltip explaining why

## 8.6 Disconnecting

* alt-click connection or pin
* right-click edge for delete
* drag edge endpoint away to reconnect

## 8.7 Context menus

Right-click menus should vary by target.

### Canvas context menu

* add node
* paste
* create comment box
* auto arrange selected/all
* frame all

### Node context menu

* cut/copy/delete
* duplicate
* collapse to subgraph
* disable node
* add comment
* align selected

### Edge context menu

* delete connection
* insert reroute
* convert or annotate

## 8.8 Keyboard shortcuts

Minimum set:

* delete
* duplicate
* copy/paste
* undo/redo
* frame selection
* frame all
* comment on selection
* search in graph
* zoom in/out/reset

Optional but recommended:

* Q/E for alignment
* C for comment box
* F for frame selection

---

## 9. Supporting Panels

## 9.1 Left panel: Outline / My Blueprint equivalent

UE5 graph editors use an outliner-style list for contained graph elements. Replicate that pattern.

Sections:

* Graphs
* Subgraphs / Functions
* Variables / Resources
* Macros / Reusable blocks
* Events / Entry points

Features:

* hierarchical tree
* create new item buttons
* rename inline
* click to navigate/focus item in graph
* search/filter

## 9.2 Left panel: Node library

A searchable palette of available nodes.

Features:

* categories
* favorites / recent
* drag-to-spawn
* keyword search
* type-filtered suggestions based on current selection or dragged pin

## 9.3 Right panel: Details inspector

This is a critical UE-like feature.

### When a node is selected

Show:

* node title
* description
* node type
* editable properties grouped into sections
* pin defaults for unconnected inputs
* advanced settings collapse section
* validation messages
* runtime state if available

### When the graph background is selected

Show graph metadata:

* graph name
* description
* tags
* execution mode
* graph-level settings

### When multiple nodes are selected

Show:

* count
* common properties
* align/distribute tools
* group/comment actions

## 9.4 Bottom utilities panel

Recommended tabs:

### Log

Plain chronological entries with levels.

### Validation

* errors
* warnings
* clicking an item focuses the related node

### Runtime trace

* executed nodes highlighted over time
* timestamps / durations optional

### Search results

* graph-wide text search
* pin and property matches

---

## 10. Readability Features

A workspace that only supports nodes and wires is not enough. UE-like systems rely on structure aids.

## 10.1 Comment boxes / group regions

Users can draw a colored region behind related nodes.

Behavior:

* resizable rectangular group
* title in top-left header
* optional auto-include dragged nodes
* can be used purely as annotation, not execution

## 10.2 Reroute nodes

Tiny pass-through nodes used to clean up wires.

Behavior:

* one in, one out
* draggable to reshape wire path
* no semantic meaning
* visually minimal

This is important for large graphs.

## 10.3 Alignment tools

Provide:

* align left/right/top/bottom
* distribute horizontally/vertically
* straighten connections

## 10.4 Auto layout

A utility, not the primary authoring mode.

Requirements:

* preserve graph directionality left-to-right
* keep entry nodes upstream
* minimize crossings where possible
* preserve comment box grouping if possible

## 10.5 Collapse to subgraph

Allow users to turn a selection into a reusable node.

Flow:

1. select nodes
2. choose collapse/create subgraph
3. derive boundary pins from external edges
4. replace selection with one container node

---

## 11. Execution and Data Semantics

To reproduce the feel of Blueprint-like graphs, distinguish explicitly between execution flow and data flow.

## 11.1 Execution flow

Represents ordering.

Rules:

* directional
* usually from left to right
* entry node initiates path
* action/branch nodes consume and emit execution

UI conventions:

* special pin shape
* special wire color/style
* optional runtime animation when executing

## 11.2 Data flow

Represents value passing.

Rules:

* typed
* input pins can have default values when disconnected
* pure nodes can compute values without execution wires

## 11.3 Pure nodes

Nodes without execution pins.

Purpose:

* compact math/formatting/transform logic
* cleaner graph for derived values

## 11.4 Event model

Allow graph entry points to be event-driven.

Examples:

* user input received
* test completed
* timeout occurred
* tool returned

---

## 12. Runtime / Debugging UX

UE-style editors become much more usable when graph state is inspectable.

## 12.1 Node state overlays

Possible states:

* idle
* running
* success
* warning
* failed
* disabled

Visual treatment:

* left edge accent or top border pulse
* small status badge/icon
* subtle not flashy

## 12.2 Execution highlighting

During test/simulation:

* active execution wires animate briefly
* current node glows/highlights
* completed nodes may fade into success state

## 12.3 Pin value inspection

Hover or inspector shows:

* current value
* last value
* source node

## 12.4 Breakpoints / pauses (optional advanced)

* mark node as pause point
* runtime halts and exposes state

## 12.5 Validation

Before run/save, validate:

* missing required connections
* incompatible pin types
* unreachable nodes
* cycles where forbidden
* missing subgraph references

---

## 13. Zoom-Level Behavior

To make large graphs usable, the workspace must adapt by zoom level.

### Near zoom

Show:

* full labels
* pin names
* metadata rows
* inline controls

### Medium zoom

Show:

* titles
* major pins
* simplified icons

### Far zoom

Show:

* node block silhouettes
* category color accents
* optionally hide pin labels
* groups/comments still readable as region blocks

This is important for preserving clarity on large graphs.

---

## 14. Information Architecture for an AI Agent Workspace

To adapt the UE5 workspace model for your use case, define standard node families.

### 14.1 Intent layer

Nodes:

* User Prompt
* Intent Parse
* Context Load
* Goal Extract

### 14.2 Planning layer

Nodes:

* Planner
* Skill Generator
* Branch Policy
* Route by Intent

### 14.3 Tooling layer

Nodes:

* Search
* Retrieve File
* API Call
* Model Inference
* Sandbox Action

### 14.4 Human-in-the-loop layer

Nodes:

* Review Gate
* Approval Required
* Parameter Edit
* Manual Override

### 14.5 Output layer

Nodes:

* Draft Response
* Action Result
* Final Status
* Test Report

This layered arrangement should encourage users to lay out graphs left-to-right like a pipeline.

---

## 15. Required Behaviors for “UE-like Feel”

These are the non-negotiable behaviors that make the workspace feel like a professional graph editor rather than a generic flowchart tool.

1. **Search-to-create node menu on right click**
2. **Drag from pin to compatible-node quick create**
3. **Curved live-updating wires**
4. **Context-sensitive Details panel**
5. **Outliner/tree of graph assets and members**
6. **Comment boxes and reroute nodes**
7. **Clear distinction between execution and data pins**
8. **Large pannable zoomable canvas with framing shortcuts**
9. **Strong dark theme with restrained semantic color**
10. **Low-latency drag and connect interactions**

If these ten are implemented well, the workspace will already feel strongly UE-inspired.

---

## 16. Non-Goals

To keep implementation focused, do not overbuild initially.

Not required in v1:

* full collaborative multiplayer editing
* perfect auto-layout engine
* full graph diff/merge UI
* complicated animation system
* 3D graph space
* arbitrary plugin marketplace

---

## 17. Functional Requirements

### 17.1 Must-have

* create/delete/move nodes
* create/delete edges
* pan/zoom canvas
* context-search node creation
* pin compatibility checking
* selection and multi-selection
* details inspector
* outliner/library panel
* comment boxes
* reroute nodes
* save/load graph JSON

### 17.2 Should-have

* undo/redo
* copy/paste and duplicate
* auto-arrange selected nodes
* subgraph/collapse feature
* validation panel
* runtime trace overlay

### 17.3 Nice-to-have

* mini-map
* keyboard-only node creation flow
* breakpoint debugging
* execution playback timeline

---

## 18. Performance Requirements

Because graph editors can grow large, performance is part of the spec.

Targets:

* pan/zoom remains smooth on graphs with 300+ nodes and 500+ edges
* dragging a node updates connected wires without visible lag
* selection and hover feedback should feel immediate
* offscreen virtualization may be used for distant nodes/panels

Implementation guidance:

* separate graph model from render state
* minimize full-canvas rerenders
* cache wire paths where possible
* use transforms for pan/zoom rather than reflowing layout

---

## 19. Accessibility and Usability

* all actions must be reachable by mouse
* major actions should also be keyboard-accessible
* color should not be the only carrier of meaning
* selected/hover/invalid states need shape/contrast cues
* text must remain readable on dark backgrounds

---

## 20. Suggested Frontend Architecture

### 20.1 Stack recommendation

* React or Next.js app shell
* graph rendering layer using SVG, Canvas, or hybrid approach
* state store for graph model + UI state
* command-based undo/redo system

### 20.2 Suggested component breakdown

* `WorkspaceShell`
* `TopToolbar`
* `LeftSidebar`
* `GraphOutlinePanel`
* `NodeLibraryPanel`
* `GraphViewport`
* `GridLayer`
* `EdgeLayer`
* `NodeLayer`
* `SelectionLayer`
* `CommentLayer`
* `InspectorPanel`
* `BottomUtilityTabs`
* `CreateNodeMenu`

### 20.3 Data model separation

Maintain separate state domains:

* graph document state
* viewport state
* selection state
* transient interaction state (dragging/connecting)
* validation/runtime state

---

## 21. Suggested JSON Shape

This is only a baseline reference, not a strict schema.

```json
{
  "graph": {
    "id": "graph_main",
    "name": "Main Workflow",
    "type": "event_graph",
    "viewport": { "x": 0, "y": 0, "zoom": 1 },
    "nodes": [
      {
        "id": "node_prompt",
        "type": "entry.user_prompt",
        "title": "User Prompt",
        "position": { "x": 120, "y": 180 },
        "inputs": [],
        "outputs": [
          { "id": "out_exec", "name": "Then", "pinKind": "execution", "dataType": "exec" },
          { "id": "out_text", "name": "Prompt", "pinKind": "data", "dataType": "string" }
        ],
        "properties": {}
      },
      {
        "id": "node_parse",
        "type": "logic.intent_parse",
        "title": "Intent Parse",
        "position": { "x": 420, "y": 160 },
        "inputs": [
          { "id": "in_exec", "name": "Exec", "pinKind": "execution", "dataType": "exec" },
          { "id": "in_text", "name": "Prompt", "pinKind": "data", "dataType": "string" }
        ],
        "outputs": [
          { "id": "out_exec", "name": "Then", "pinKind": "execution", "dataType": "exec" },
          { "id": "out_intent", "name": "Intent", "pinKind": "data", "dataType": "intent" }
        ],
        "properties": {
          "mode": "fast"
        }
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "fromNodeId": "node_prompt",
        "fromPinId": "out_exec",
        "toNodeId": "node_parse",
        "toPinId": "in_exec",
        "edgeType": "execution"
      },
      {
        "id": "edge_2",
        "fromNodeId": "node_prompt",
        "fromPinId": "out_text",
        "toNodeId": "node_parse",
        "toPinId": "in_text",
        "edgeType": "data"
      }
    ],
    "groups": []
  }
}
```

---

## 22. Acceptance Criteria

The implementation should be considered successful when a user can:

1. open the workspace and immediately recognize it as a professional graph editor
2. right-click to search and create nodes
3. drag wires between typed pins with clear compatibility feedback
4. navigate large graphs through pan, zoom, and framing shortcuts
5. inspect and edit selected nodes in the right panel
6. organize graphs with comments, reroutes, and alignment tools
7. distinguish execution flow from data flow at a glance
8. run or simulate a graph and observe state/debug feedback

---

## 23. Build Order Recommendation

### Phase 1: Skeleton workspace

* shell layout
* toolbar
* side panels
* canvas pan/zoom
* static nodes

### Phase 2: Core graph editing

* pins
* edges
* connect/disconnect
* selection
* context menu creation

### Phase 3: Inspector and library

* details panel
* outline panel
* node library and search

### Phase 4: Readability and ergonomics

* comment boxes
* reroutes
* alignment tools
* keyboard shortcuts

### Phase 5: Runtime UX

* validation
* execution highlighting
* logs/test pane

### Phase 6: Advanced modularity

* subgraphs
* collapse to module
* reusable templates

---

## 24. Final Implementation Notes

When uncertain, prefer the following tradeoffs:

* prefer clarity over flashy motion
* prefer compact density over oversized cards
* prefer consistent semantics over decorative styling
* prefer responsive direct manipulation over wizard flows
* prefer strong defaults over excessive initial customization

The essence of the UE5 workspace is not just “nodes connected by lines.”
It is a **tool-grade visual programming environment** built around:

* spatial composition
* explicit interfaces
* context-sensitive property editing
* readable complexity
* fast authoring loops

That is the standard this implementation should aim for.

