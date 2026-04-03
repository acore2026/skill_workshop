## Context

The project requires improved observability into how AI agents map natural language to specific network skills. We need to implement two UI features: a modal library for skill definitions and a dynamic banner for real-time routing feedback.

## Goals / Non-Goals

**Goals:**
- Implement a `SkillLibraryModal` with a two-pane selection/display layout.
- Implement a `RoutingBanner` that reacts to execution states (`isProcessing`, `matchedSkill`).
- Ensure the banner can open the modal with a specific skill pre-selected.

**Non-Goals:**
- Modifying the backend API (all data is client-side or derived from existing streams).
- Persisting modal selection state across page refreshes.

## Decisions

### 1. Store-Driven Modal State
We will add `isSkillLibraryOpen` and `selectedSkillId` to the global Zustand store (`src/store/useStore.ts`).
- **Rationale**: This allows the `NavHeader` (rendered in the global shell) to open the modal and allows the `RoutingBanner` (rendered in the main page) to both open the modal and set the pre-selected skill.

### 2. Framer Motion for Banner Animations
We will use `framer-motion` for the Routing Banner's entry/exit and state transitions.
- **Rationale**: The project already uses Framer Motion, and it provides the easiest way to implement the "slide down" and "fade in" requirements with clean syntax.

### 3. Tailwind for Modal Layout
The modal will be built using standard Tailwind utility classes for the backdrop blur, centering, and the 1/3-2/3 split layout.
- **Rationale**: Consistent with the project's styling approach and avoids heavy external UI library dependencies.

## Risks / Trade-offs

- **[Risk] Z-Index Collisions** → The modal might appear behind other absolute-positioned elements (like the agent chatbox).
  - **Mitigation**: Use a standard `z-50` or higher for the modal overlay and ensure it is rendered near the root of the page structure.
- **[Trade-off] Local vs Global State** → Moving UI selection state to the global store adds boilerplate.
  - **Rationale**: Necessary for the cross-component communication required between the Banner and the Header-triggered Modal.
