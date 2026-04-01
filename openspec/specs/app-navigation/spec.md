## ADDED Requirements

### Requirement: Shared Navigation Header
The application SHALL provide a persistent navigation header visible on both the Workshop and Execution pages.

#### Scenario: Switching between Workshop and Execution
- **WHEN** the user clicks the "Execution" link in the navigation header while on the Workshop page
- **THEN** the application navigates to the `/execution` route

### Requirement: App Shell Integration
Both the Workshop and Execution pages SHALL be wrapped in a shared `AppShell` component to provide a consistent layout and sidebar behavior.

#### Scenario: Consistent Layout
- **WHEN** navigating between Workshop and Execution pages
- **THEN** the top header and side panel structural framework remain consistent
