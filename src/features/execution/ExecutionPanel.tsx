import React from 'react';
import Button from '../../components/Button';
import { useStore } from '../../store/useStore';
import './ExecutionPanel.css';

const ExecutionPanel: React.FC = () => {
  const { document, appState, runMockExecution, resetExecution } = useStore();

  if (!document) {
    return null;
  }

  return (
    <div className="execution-panel">
      <div className="execution-header">
        <div className="execution-controls">
          <Button variant="primary" size="sm" onClick={runMockExecution} disabled={appState === 'mock_running'}>
            {appState === 'mock_running' ? 'Running...' : 'Run Sandbox'}
          </Button>
          <Button variant="ghost" size="sm" onClick={resetExecution}>
            Reset
          </Button>
        </div>
        <div className="execution-status-label">
          Status: <span className={`status-${appState}`}>{appState.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="execution-logs">
        {document.execution.timeline.length === 0 ? (
          <div className="empty-logs">No active execution logs.</div>
        ) : (
          document.execution.timeline.map((log) => (
            <div key={log.id} className="log-entry">
              <span className="log-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExecutionPanel;
