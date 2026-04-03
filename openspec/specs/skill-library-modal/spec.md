## ADDED Requirements

### Requirement: Trigger Button
The application SHALL include a button in the global header with a `BookOpen` icon and the text "Active Skills".

#### Scenario: Opening the Modal
- **WHEN** the user clicks the "Active Skills" button in the header
- **THEN** the Skill Library modal SHALL open

### Requirement: Modal Layout
The Skill Library modal SHALL be centered over the UI with a dark backdrop blur (`backdrop-blur-sm`).

#### Scenario: Visualizing Modal Structure
- **WHEN** the modal is open
- **THEN** it SHALL display a left sidebar (1/3 width) and a main content area (2/3 width)

### Requirement: Skill Selection
The sidebar SHALL list available skills, and selecting a skill SHALL update the main area with its Markdown definition.

#### Scenario: Selecting a Skill
- **WHEN** the user clicks a skill name in the modal sidebar
- **THEN** the main content area SHALL display the raw Markdown string for that skill in a dark-themed monospaced block

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
