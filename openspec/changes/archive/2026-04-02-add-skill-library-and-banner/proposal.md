## Why

Currently, the AI's "thinking" process and the underlying skill definitions (Markdown/YAML) are opaque to the user. To improve transparency and educational value, we need a way to inspect the raw definitions being used and provide real-time visual feedback when the system successfully maps a user's natural language intent to a specific 6G network skill.

## What Changes

- **Skill Library Modal**: A new global modal component accessible from the header.
  - Displays a sidebar of available skills and a main content area for the raw Markdown/YAML definition.
  - Triggered by a new button in the `NavHeader`.
- **Dynamic Routing Context Banner**: A state-aware banner positioned below the intent console.
  - Transitions between "Hidden", "Thinking" (analyzing intent), and "Matched" (skill identified) states.
  - Provides a direct link to open the Skill Library with the matched skill auto-selected.
- **State Integration**: New state hooks to manage modal visibility, active skill selection, and the matched skill context.

## Capabilities

### New Capabilities
- `skill-library-modal`: A two-pane modal interface for browsing and inspecting raw agent skill definitions.
- `routing-context-banner`: A dynamic UI banner that provides live feedback on intent analysis and mapping status.

### Modified Capabilities
- None.

## Impact

- **Frontend Components**:
  - `src/components/NavHeader.tsx`: Addition of the "Active Skills" trigger button.
  - `src/app/ExecutionPage.tsx`: Integration of the Banner component and Modal logic.
- **Global Styling**: Utilization of Tailwind CSS classes for layout and animations.
- **Data Model**: Utilization of the `SCENARIOS` data structure to populate definitions.
