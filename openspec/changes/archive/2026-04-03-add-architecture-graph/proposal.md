## Why

The application currently lacks a high-level visual representation of the network topology it manages. To provide users with a comprehensive view of the 6G core architecture and how agents interact with network functions, we need a dedicated "Architecture" page featuring an interactive, highly detailed diagram.

## What Changes

- **New "Architecture" Page**: Add a third primary navigation target to the application.
- **`ArchitectureGraph` Component**: Implement a complex, interactive SVG or Canvas-based diagram using `@xyflow/react` (already used in the project) to represent network nodes, connections, and agent placements.
- **Layout Integration**: Update `NavHeader` and `App.tsx` to support the new "Architecture" tab.
- **Interactive Capabilities**: Allow users to click on network nodes to see detailed properties or status.

## Capabilities

### New Capabilities
- `network-topology-view`: Interactive visualization of the 6G network architecture.
- `architecture-navigation`: Global navigation support for the Architecture view.

### Modified Capabilities
- `app-navigation`: Update existing navigation logic to include the new Architecture tab.

## Impact

- `src/App.tsx`: New route for `/architecture`.
- `src/components/NavHeader.tsx`: New navigation link.
- `src/features/architecture/ArchitectureGraph.tsx`: New core component.
- `src/store/useStore.ts`: Potential state additions for architecture node selection.
