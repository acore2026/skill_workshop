## Context

The application currently has two primary views: Workshop (editing) and Execution (monitoring). We need to introduce a third view, "Architecture", which provides a static but interactive visualization of the underlying 6G core network topology. This helps ground the agent workflows in a physical or logical network context.

## Goals / Non-Goals

**Goals:**
- Implement a dedicated `ArchitecturePage` component.
- Create a highly detailed `ArchitectureGraph` component using `@xyflow/react`.
- Define a standard set of 6G network function nodes (AMF, SMF, UPF, etc.).
- Integrate the new page into the `NavHeader` and `App.tsx` router.

**Non-Goals:**
- Implementing real-time traffic animation in the architecture view (static topology only).
- Allowing users to edit the architecture (read-only visualization).

## Decisions

### 1. Reuse `@xyflow/react` for Architecture Visualization
- **Rationale**: The project already uses React Flow for the Workshop view. Reusing it for the architecture diagram ensures consistent styling, interaction patterns (zoom/pan), and reduces the bundle size compared to adding a new library like D3 or Cytoscape.

### 2. Static Topology Data Model
- **Rationale**: Since the architecture is read-only for now, we will define the nodes and edges in a constant file (`src/lib/architectureData.ts`). This allows for easy updates to the "canonical" topology without complex state management.

### 3. Shared `AppShell` and `NavHeader`
- **Rationale**: To maintain a cohesive user experience, the Architecture page will use the same `AppShell` layout as the other views, ensuring the header and side-panel framework remain stable.

## Risks / Trade-offs

- **[Risk] Visual Complexity** → A "highly detailed" diagram might become cluttered.
  - **Mitigation**: Use custom node components with clear icons and grouped layouts (e.g., control plane vs. user plane).
- **[Trade-off] React Flow vs. SVG** → SVG is lighter, but React Flow provides built-in interactivity.
  - **Rationale**: The need for interactive "details on click" and consistent zoom/pan behavior outweighs the overhead of React Flow.
