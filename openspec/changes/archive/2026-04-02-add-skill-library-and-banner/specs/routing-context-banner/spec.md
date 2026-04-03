## ADDED Requirements

### Requirement: Banner Placement
The Routing Context Banner SHALL be positioned directly below the Intent Console input bar.

#### Scenario: Initial State
- **WHEN** the application is idle and no processing is occurring
- **THEN** the banner SHALL be hidden (height 0 and opacity 0)

### Requirement: Thinking State
The banner SHALL display a loading spinner and intent analysis text when the system is processing.

#### Scenario: Analyzing Intent
- **WHEN** `isProcessing` is true
- **THEN** the banner SHALL slide down and show "System Agent is analyzing natural language to map to a 6G Skill..."

### Requirement: Matched State
The banner SHALL update to show the matched skill ID once the system identifies a matching skill.

#### Scenario: Successful Skill Match
- **WHEN** a matching skill is identified
- **THEN** the banner SHALL display "System Agent Match Decision:" followed by the skill ID in a highlighted badge

### Requirement: Modal Integration
The banner SHALL include a link to view the skill definition which opens the Skill Library modal.

#### Scenario: Deep Linking to Skill Definition
- **WHEN** the user clicks "View Skill Definition" in the banner
- **THEN** the Skill Library modal SHALL open with the matched skill automatically selected in the sidebar
