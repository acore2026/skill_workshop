## ADDED Requirements

### Requirement: Interactive Network Diagram
The system SHALL provide a highly detailed, interactive network topology diagram representing 6G core network functions (AMF, SMF, UPF, UDM, etc.) and agent access points.

#### Scenario: Visualizing Network Topology
- **WHEN** the user navigates to the Architecture page
- **THEN** the system SHALL render a diagram showing network nodes and their logical connections

### Requirement: Node Interaction
Users SHALL be able to interact with individual nodes in the architecture graph to view metadata or status.

#### Scenario: Clicking a Network Node
- **WHEN** the user clicks on a node (e.g., UPF) in the diagram
- **THEN** the system SHALL highlight the node and display its properties in an inspector or tooltip

### Requirement: Responsive Layout
The diagram SHALL automatically adjust its layout to fit the available screen space.

#### Scenario: Resizing the Browser
- **WHEN** the browser window is resized
- **THEN** the diagram SHALL scale or re-center to remain visible within the main content area
