## MODIFIED Requirements

### Requirement: Shared Navigation Header
The application SHALL provide a persistent navigation header visible on the Architecture, Workshop, and Execution pages.

#### Scenario: Switching between Workshop and Execution
- **WHEN** the user clicks the "Execution" link in the navigation header while on the Workshop page
- **THEN** the application navigates to the `/execution` route

#### Scenario: Navigating to Architecture
- **WHEN** the user clicks the "Architecture" link in the navigation header
- **THEN** the application navigates to the `/architecture` route

### Requirement: App Shell Integration
The Architecture, Workshop, and Execution pages SHALL be wrapped in a shared `AppShell` component to provide a consistent layout and sidebar behavior.

#### Scenario: Consistent Layout
- **WHEN** navigating between Architecture, Workshop, and Execution pages
- **THEN** the top header and side panel structural framework remain consistent
