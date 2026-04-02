## ADDED Requirements

### Requirement: PCAP Style Traffic Visualization
The Execution Monitor SHALL display simulated network traffic in a PCAP-style table showing Time, Source, Dest, Proto, and Info.

#### Scenario: Viewing tool execution traffic
- **WHEN** a tool is executed during the simulation
- **THEN** an outgoing request packet and incoming response packet are added to the traffic table

### Requirement: Detailed Packet Inspection
The system SHALL provide a detailed view of a selected packet from the PCAP table, displaying formatted JSON details.

#### Scenario: Inspecting a packet
- **WHEN** a user double-clicks a packet row in the traffic table
- **THEN** the Packet Details panel opens displaying the layered information for that frame
