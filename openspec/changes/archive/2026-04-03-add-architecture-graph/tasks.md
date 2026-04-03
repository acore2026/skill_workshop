## 1. Setup and Data Modeling

- [x] 1.1 Create `src/lib/architectureData.ts` to define the 6G network topology nodes and edges.
- [x] 1.2 Implement `src/app/ArchitecturePage.tsx` as a basic wrapper component.

## 2. Component Implementation

- [x] 2.1 Implement `src/features/architecture/ArchitectureGraph.tsx` using `@xyflow/react`.
- [x] 2.2 Create custom node components for network functions (AMF, SMF, UPF, etc.) with consistent icons.
- [x] 2.3 Implement interaction logic to display node properties on click.

## 3. Global Integration

- [x] 3.1 Update `src/App.tsx` to include the `/architecture` route.
- [x] 3.2 Add the "Architecture" navigation link to `src/components/NavHeader.tsx`.
- [x] 3.3 Ensure active state styling works for the new Architecture tab in the header.

## 4. Refinement

- [x] 4.1 Optimize the graph layout for different screen sizes.
- [x] 4.2 Verify smooth navigation between Architecture, Workshop, and Execution pages.
