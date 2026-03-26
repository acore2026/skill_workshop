import React from 'react';
import './StatusPill.css';

export type StatusType = 'idle' | 'generating' | 'draft_ready' | 'editing' | 'validating' | 'ready_to_run' | 'mock_running' | 'run_complete' | 'error';

interface StatusPillProps {
  status: StatusType;
  label?: string;
}

const statusMap: Record<StatusType, { label: string, color: string }> = {
  idle: { label: 'Idle', color: 'gray' },
  generating: { label: 'Generating', color: 'blue' },
  draft_ready: { label: 'Draft Ready', color: 'cyan' },
  editing: { label: 'Editing', color: 'indigo' },
  validating: { label: 'Validating', color: 'amber' },
  ready_to_run: { label: 'Ready to Run', color: 'green' },
  mock_running: { label: 'Running', color: 'blue' },
  run_complete: { label: 'Run Complete', color: 'green' },
  error: { label: 'Error', color: 'red' },
};

const StatusPill: React.FC<StatusPillProps> = ({ status, label }) => {
  const config = statusMap[status] || statusMap.idle;
  const displayLabel = label || config.label;
  
  return (
    <span className={`status-pill status-${config.color}`}>
      {displayLabel}
    </span>
  );
};

export default StatusPill;
