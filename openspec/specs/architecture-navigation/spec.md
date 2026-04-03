## ADDED Requirements

### Requirement: Architecture Tab in Header
The global navigation header SHALL include an "Architecture" tab.

#### Scenario: Navigating via Header
- **WHEN** the user clicks on the "Architecture" tab in the `NavHeader`
- **THEN** the application SHALL route the user to the `/architecture` page

### Requirement: Default Active State
The "Architecture" tab SHALL display an active visual state when the user is on the `/architecture` route.

#### Scenario: Visual Confirmation of Current Page
- **WHEN** the current URL is `/architecture`
- **THEN** the "Architecture" link in the `NavHeader` SHALL be highlighted as active
