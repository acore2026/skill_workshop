## Context

The system currently relies on a hardcoded `SCENARIOS` object in the frontend to populate the Skill Library. The backend now provides a `GET /api/skills` endpoint that serves these definitions. We need to transition the frontend to use this dynamic source.

## Goals / Non-Goals

**Goals:**
- Implement an async loading mechanism for skills.
- Ensure the UI handles loading and error states gracefully.
- Maintain compatibility with the `matchedSkillId` logic used for routing feedback.

**Non-Goals:**
- Modifying the backend API.
- Implementing client-side editing of skills (read-only for now).

## Decisions

### 1. Store-Managed Skill State
We will add a `skills` array to `useStore.ts` and a `loadSkills` action.
- **Rationale**: Keeps the data global and accessible to both the `SkillLibraryModal` and the `ExecutionPage`. It also allows us to trigger the fetch once at application startup or when the modal is first opened.

### 2. Migration of Scenario Types
We will move the `Scenario` interface to a shared location (likely `src/lib/api.ts` or a dedicated types file) and repurpose `src/lib/scenarios.ts` to be an empty or deprecated file.
- **Rationale**: Avoids circular dependencies and clarifies that the data is now coming from the API.

### 3. Progressive Loading
The application will fetch skills during the initial `loadToolCatalog` sequence or as a parallel initialization step.
- **Rationale**: Ensures skills are ready before the user interacts with the intent console or library.

## Risks / Trade-offs

- **[Risk] API Failure** → If the backend is down, the Skill Library will be empty.
  - **Mitigation**: Implement a retry mechanism or keep a small set of "fallback" local skills if critical. For now, a clear error message in the UI is sufficient.
- **[Trade-off] Loading Latency** → Fetching skills adds a small delay to the initial load.
  - **Rationale**: The payload is small (Markdown text), so the impact is negligible compared to the benefits of consistency.
