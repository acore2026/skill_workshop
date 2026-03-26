import React from 'react';
import AgentChatbox from '../features/prompt/AgentChatbox';
import GraphEditor from '../features/graph/GraphEditor';
import ExecutionPanel from '../features/execution/ExecutionPanel';
import InspectorPanel from '../features/inspector/InspectorPanel';
import StatusPill from '../components/StatusPill';
import { useStore } from '../store/useStore';
import './Workspace.css';

const Workspace: React.FC = () => {
  const { appState, document } = useStore();

  return (
    <div className="workspace-container">
      {/* Left Pane: Agent Chatbox */}
      <div className="pane left-pane">
        <div className="pane-header">
          Agent Workspace
        </div>
        <div className="pane-content no-padding">
          <AgentChatbox />
        </div>
      </div>

      {/* Center Pane: Graph Editor */}
      <div className="pane center-pane">
        <div className="center-header">
          <div className="header-title-group">
            <div className="header-title">Orchestration Dashboard</div>
            {document && <div className="header-subtitle">{document.meta.title}</div>}
          </div>
          <div className="header-actions">
            <StatusPill status={appState} />
          </div>
        </div>
        <div className="graph-canvas-container">
          <GraphEditor />
        </div>
        
        {/* Lower Panel: Logs / Execution */}
        <div className="lower-panel">
          <div className="panel-header">
            Execution Timeline & Logs
          </div>
          <div className="panel-content no-padding">
            <ExecutionPanel />
          </div>
        </div>
      </div>

      {/* Right Pane: Inspector */}
      <div className="pane right-pane">
        <div className="pane-header">
          Inspector
        </div>
        <div className="pane-content">
          <InspectorPanel />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
