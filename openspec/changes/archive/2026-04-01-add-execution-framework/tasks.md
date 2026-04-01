## 1. Shared Layout Refactoring

- [x] 1.1 Extract CSS from `Workspace.css` into a shared `AppShell.css`.
- [x] 1.2 Create a generic `AppShell.tsx` component to handle layout, sidebars, and resizing logic.
- [x] 1.3 Create a standalone `NavHeader.tsx` component with tabs for Workshop and Execution.
- [x] 1.4 Refactor `Workspace.tsx` to use the new `AppShell` and `NavHeader`.

## 2. Routing and New Page Skeleton

- [x] 2.1 Update `src/App.tsx` to use `react-router-dom` and define routes for `/` and `/execution`.
- [x] 2.2 Create a basic `ExecutionPage.tsx` skeleton that uses the `AppShell`.
- [x] 2.3 Implement placeholder panels in `ExecutionPage` for History, Monitor, and Inspector.

## 3. Navigation and UX

- [x] 3.1 Verify navigation between Workshop and Execution modes via the header tabs.
- [x] 3.2 Ensure persistent UI state (like sidebar collapse/width) works across both pages.
- [x] 3.3 Add a basic "Under Construction" or "Mock Execution" message to the execution page.
