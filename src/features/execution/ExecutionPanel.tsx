import React, { useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import Button from '../../components/Button';
import './ExecutionPanel.css';

type NodeStatus = 'pending' | 'running' | 'success' | 'skipped' | 'error';

const ExecutionPanel: React.FC = () => {
  const { document, updateDocument, setAppState, appState } = useStore();
  const [logs, setLogs] = useState<string[]>([]);

  const runMockExecution = useCallback(() => {
    if (!document) return;

    setAppState('mock_running');
    setLogs(['[SYSTEM] Initializing mock sandbox...', '[SYSTEM] Validating graph topology...']);

    let step = 0;
    const nodeIds = document.nodes.map((n) => n.id);
    const nodeStatuses: Record<string, NodeStatus> = {};
    
    nodeIds.forEach(id => nodeStatuses[id] = 'pending');

    const interval = setInterval(() => {
      if (step >= nodeIds.length) {
        clearInterval(interval);
        setAppState('run_complete');
        setLogs(prev => [...prev, '[SYSTEM] Execution completed successfully.']);
        return;
      }

      const nodeId = nodeIds[step];
      const node = document.nodes.find(n => n.id === nodeId);
      
      setLogs(prev => [...prev, `[NODE] Executing ${node?.label || nodeId}...`]);
      
      nodeStatuses[nodeId] = 'running';
      updateDocument({
        execution: {
          ...document.execution,
          nodeStatuses: { ...nodeStatuses },
          timeline: document.execution?.timeline || [],
        }
      });

      setTimeout(() => {
        nodeStatuses[nodeId] = 'success';
        setLogs(prev => [...prev, `[NODE] ${node?.label || nodeId} finished.`]);
        updateDocument({
          execution: {
            ...document.execution,
            nodeStatuses: { ...nodeStatuses },
            timeline: document.execution?.timeline || [],
          }
        });
      }, 500);

      step++;
    }, 1000);
  }, [document, setAppState, updateDocument]);

  const resetExecution = () => {
    if (!document) return;
    setAppState('ready_to_run');
    setLogs([]);
    updateDocument({
      execution: {
        lastRun: undefined,
        nodeStatuses: {},
        timeline: [],
      }
    });
  };

  if (!document) return null;

  return (
    <div className="execution-panel">
      <div className="execution-header">
        <div className="execution-controls">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={runMockExecution}
            disabled={appState === 'mock_running'}
          >
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
        {logs.length === 0 ? (
          <div className="empty-logs">No active execution logs.</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="log-entry">
              <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span> {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExecutionPanel;
