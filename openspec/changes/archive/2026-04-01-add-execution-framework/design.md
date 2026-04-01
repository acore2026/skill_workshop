## Context

The current Skill Workshop is a single-page application where the entire UI is contained within `src/app/Workspace.tsx`. To support a second page for execution monitoring, we need a robust routing and layout system.

## Goals / Non-Goals

**Goals:**
- Introduce `react-router-dom` for client-side navigation.
- Extract a shared `AppShell` to handle the responsive layout, sidebars, and header.
- Create a `NavHeader` component with tabs to switch between Workshop and Execution modes.
- Implement a skeleton for the `ExecutionPage`.

**Non-Goals:**
- Implementation of the actual execution/simulation engine (this is a framework-only change).
- Persistence of execution runs.
- Mobile-responsive layout for the new page (desktop-first focus like the editor).

## Decisions

### 1. Refactor to `AppShell` Pattern
The current `Workspace.tsx` contains logic for resizable panels and toolbars. We will move this "shell" logic into a generic `src/components/AppShell.tsx` that accepts a `children` prop for the main area and a `sidePanel` prop for the right-hand editor/inspector area.
- **Rationale**: This prevents code duplication when building the Execution page, ensuring consistent sidebar and header behavior across the entire app.

### 2. NavHeader with Route-Based Tabs
The toolbar will be refactored into a `NavHeader` component. It will use `NavLink` from `react-router-dom` to provide visual feedback for the active view.
- **Rationale**: Standard web navigation patterns make the app feel professional and easy to navigate.

### 3. State Management (Zustand)
We will continue using the existing Zustand store. No major changes are needed for the skeleton, but we will ensure the store can be accessed by both the Workshop and Execution pages.
- **Rationale**: Leverage existing infrastructure without adding unnecessary complexity.

## Risks / Trade-offs

- **[Risk] Layout Breakage** → Refactoring the shell from `Workspace.tsx` might break existing CSS or resizer logic.
  - **Mitigation**: Perform the refactor in small, testable steps and verify panel resizing immediately after extraction.
- **[Trade-off] Component Complexity** → Creating a generic `AppShell` might add initial complexity compared to simple copy-pasting.
  - **Rationale**: The long-term maintainability of a shared shell outweighs the initial setup cost.
