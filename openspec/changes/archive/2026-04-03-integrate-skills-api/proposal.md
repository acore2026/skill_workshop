## Why

The current Skill Library in the frontend uses hardcoded data in `src/lib/scenarios.ts`. This creates a maintenance burden and potential inconsistency as skills evolve in the backend. We need to integrate the new `GET /api/skills` endpoint to ensure the UI library is always synchronized with the canonical skill definitions served by the backend.

## What Changes

- **Dynamic Skill Loading**: Replace the hardcoded `SCENARIOS` constant with data fetched from the backend.
- **API Integration**: Add a new API client function to fetch skills from `/api/skills`.
- **Store Updates**: Implement logic in the global store to load and manage the dynamic list of skills.
- **Component Refactoring**: Update `SkillLibraryModal` and other components to consume skills from the store instead of the hardcoded file.

## Capabilities

### New Capabilities
- `dynamic-skill-fetching`: Capability to retrieve and cache 6G skill definitions from the backend API.

### Modified Capabilities
- `skill-library-modal`: Update the modal to handle loading states and dynamic data from the API.

## Impact

- `src/lib/api.ts`: New function `requestSkills`.
- `src/store/useStore.ts`: New state `skills`, and action `loadSkills`.
- `src/features/navigation/SkillLibraryModal.tsx`: Updated to use store-provided skills.
- `src/lib/scenarios.ts`: Will be deprecated or repurposed as a type definition file.
