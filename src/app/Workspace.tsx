import React from 'react';
import {
  CheckCircle2,
  LayoutGrid,
  Maximize2,
  Play,
  Search,
  Settings2,
  Undo2,
  Redo2,
  Save,
} from 'lucide-react';
import GraphEditor from '../features/graph/GraphEditor';
import InspectorPanel from '../features/inspector/InspectorPanel';
import EditorSidebar from '../features/navigation/EditorSidebar';
import UtilityPanel from '../features/utility/UtilityPanel';
import StatusPill from '../components/StatusPill';
import Button from '../components/Button';
import { useStore } from '../store/useStore';
import './Workspace.css';

const Workspace: React.FC = () => {
  const {
    document,
    appState,
    validateDocument,
    autoLayout,
    requestFitView,
    runMockExecution,
  } = useStore();

  return (
    <div className="workspace-shell">
      <header className="workspace-toolbar">
        <div className="toolbar-brand">
          <div className="brand-mark">WS</div>
          <div>
            <div className="brand-title">Workspace Graph Editor</div>
            <div className="brand-subtitle">{document?.name ?? 'No graph loaded'}</div>
          </div>
        </div>

        <div className="toolbar-actions">
          <Button size="sm" variant="secondary">
            <Save size={14} />
            Save
          </Button>
          <Button size="sm" variant="ghost" disabled>
            <Undo2 size={14} />
            Undo
          </Button>
          <Button size="sm" variant="ghost" disabled>
            <Redo2 size={14} />
            Redo
          </Button>
          <Button size="sm" variant="secondary">
            <Search size={14} />
            Search
          </Button>
          <Button size="sm" variant="primary" onClick={runMockExecution} disabled={appState === 'mock_running'}>
            <Play size={14} />
            Run
          </Button>
          <Button size="sm" variant="secondary" onClick={autoLayout}>
            <LayoutGrid size={14} />
            Auto Layout
          </Button>
          <Button size="sm" variant="secondary" onClick={requestFitView}>
            <Maximize2 size={14} />
            Zoom To Fit
          </Button>
          <Button size="sm" variant="secondary" onClick={validateDocument}>
            <CheckCircle2 size={14} />
            Validate
          </Button>
          <Button size="sm" variant="ghost">
            <Settings2 size={14} />
            Settings
          </Button>
        </div>

        <div className="toolbar-status">
          <StatusPill status={appState} />
        </div>
      </header>

      <main className="workspace-main">
        <aside className="workspace-sidebar">
          <EditorSidebar />
        </aside>

        <section className="workspace-center">
          <div className="workspace-surface">
            <GraphEditor />
          </div>
          <div className="workspace-bottom-panel">
            <UtilityPanel />
          </div>
        </section>

        <aside className="workspace-inspector">
          <InspectorPanel />
        </aside>
      </main>
    </div>
  );
};

export default Workspace;
