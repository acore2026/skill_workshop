## ADDED Requirements

### Requirement: Dynamic Skill Loading
The application SHALL fetch the list of available 6G skills from the backend `/api/skills` endpoint on initialization.

#### Scenario: Successful Skill Fetch
- **WHEN** the application starts
- **THEN** it SHALL request skills from `/api/skills` and populate the global store with the results

### Requirement: Loading and Error Handling
The Skill Library SHALL display appropriate status messages while fetching data or if the API request fails.

#### Scenario: API Error State
- **WHEN** the `/api/skills` request fails
- **THEN** the Skill Library SHALL show an error message: "Failed to load skill library. Please check your connection."
