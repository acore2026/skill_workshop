## ADDED Requirements

### Requirement: Dynamic Skill Display
The Skill Library sidebar SHALL dynamically list skills returned by the backend API.

#### Scenario: Rendering API Results
- **WHEN** the modal is open and skills have been loaded from the API
- **THEN** it SHALL display the names and descriptions of all returned skills in the sidebar

### Requirement: Loading Indicators
The modal SHALL display a loading spinner if the user opens the library before the background fetch is complete.

#### Scenario: Modal Loading State
- **WHEN** the user opens the Skill Library while `isLoadingSkills` is true
- **THEN** it SHALL display a "Loading skills..." message with a spinner icon
