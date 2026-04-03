## 1. API and Types Setup

- [x] 1.1 Move the `Scenario` interface to `src/lib/api.ts` and rename it to `Skill`.
- [x] 1.2 Implement the `requestSkills` function in `src/lib/api.ts` to fetch from `/api/skills`.
- [x] 1.3 Update `src/lib/scenarios.ts` to export an empty `SCENARIOS` object or deprecate it entirely.

## 2. Store Integration

- [x] 2.1 Add `skills` (array of `Skill`), `isLoadingSkills` (boolean), and `skillsError` (string | null) to `useStore.ts`.
- [x] 2.2 Implement the `loadSkills` async action in `useStore.ts` to fetch and store skills.
- [x] 2.3 Update the existing `loadToolCatalog` action to also trigger `loadSkills` in parallel.

## 3. UI Refactoring

- [x] 3.1 Update `SkillLibraryModal.tsx` to use `skills`, `isLoadingSkills`, and `skillsError` from the store.
- [x] 3.2 Refactor the `selectedSkill` logic in the modal to find the skill within the store's array instead of the hardcoded object.
- [x] 3.3 Add a loading spinner and error message to the modal's UI.
- [x] 3.4 Ensure the `RoutingBanner.tsx` still correctly links to the modal with the pre-selected skill.
