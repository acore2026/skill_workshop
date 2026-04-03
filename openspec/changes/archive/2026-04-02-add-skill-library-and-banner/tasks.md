## 1. Store and Data Setup

- [x] 1.1 Add `isSkillLibraryOpen`, `selectedSkillId`, and `matchedSkillId` state to `useStore.ts`.
- [x] 1.2 Implement actions in the store to toggle the modal and set the selected/matched skill.
- [x] 1.3 Create a new constant file `src/lib/scenarios.ts` to house the `SCENARIOS` data structure.

## 2. Skill Library Modal

- [x] 2.1 Implement the `SkillLibraryModal.tsx` component with a Tailwind-based centered layout.
- [x] 2.2 Build the two-pane interface: 1/3 sidebar list and 2/3 dark-themed monospaced viewer.
- [x] 2.3 Add the "Active Skills" trigger button to `src/components/NavHeader.tsx` using `BookOpen` from `lucide-react`.

## 3. Routing Context Banner

- [x] 3.1 Implement the `RoutingBanner.tsx` component using `framer-motion` for slide and fade effects.
- [x] 3.2 Add the "Thinking" state with a loading spinner and "Matched" state with the skill ID badge.
- [x] 3.3 Link the banner's "View Skill Definition" text to open the modal with the matching skill pre-selected.

## 4. Integration and Final Polish

- [x] 4.1 Integrate the `RoutingBanner` into `src/app/ExecutionPage.tsx` directly below the intent console.
- [x] 4.2 Render the `SkillLibraryModal` in the top-level application structure.
- [x] 4.3 Update the WebSocket message handler to set `matchedSkillId` when a routing decision is received.
