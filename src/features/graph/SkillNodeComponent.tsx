import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { SkillNode, WorkflowOutput } from '../../schemas/skill';
import './SkillNodeComponent.css';

interface GraphNodeData {
  id: string;
  cardType: SkillNode['cardType'];
  title: string;
  summary: string;
  badge?: string;
  tint?: string;
  toolName?: string;
  flowOutputs: WorkflowOutput[];
  status?: string;
  onUpdateNode: (id: string, updates: Partial<SkillNode>) => void;
}

const handleId = (portId: string, side: 'source' | 'target') => `${portId}::${side}`;
const terminalCardTypes = new Set<SkillNode['cardType']>(['success', 'failure']);

const formatFlowLabel = (label: string) => {
  const normalized = label.trim().toLowerCase();
  switch (normalized) {
    case 'begin':
      return 'Start Flow';
    case 'next':
      return 'Continue';
    case 'continue':
      return 'Continue';
    case 'abort':
      return 'Stop';
    case 'done':
      return 'Done';
    case 'repeat':
      return 'Try Again';
    case 'match':
      return 'Match Found';
    case 'fallback':
      return 'Fallback';
    case 'join':
      return 'Merge';
    case 'lane-a':
      return 'Lane A';
    case 'lane-b':
      return 'Lane B';
    default:
      return label
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
};

const WorkflowLane: React.FC<{ nodeId: string; cardType: SkillNode['cardType']; outputs: WorkflowOutput[]; terminal: boolean }> = ({
  nodeId,
  cardType,
  outputs,
  terminal,
}) => (
  <div className="next-lane">
    <div className="next-list">
      {cardType !== 'start' ? (
        <Handle
          id={handleId(nodeId, 'target')}
          type="target"
          position={Position.Left}
          className="node-handle next-handle"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
      ) : null}
      {outputs.length === 0 ? (
        <div className="lane-empty">No next step</div>
      ) : (
        outputs.map((output) => (
          <div key={output.id} className="next-row">
            <div className="next-copy">
              <div className="next-kicker">Next Step</div>
              <div className="next-label">{formatFlowLabel(output.label)}</div>
            </div>
            {terminal ? (
              <span className="next-terminal">end</span>
            ) : (
              <Handle
                id={handleId(output.id, 'source')}
                type="source"
                position={Position.Right}
                className="node-handle next-handle"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              />
            )}
          </div>
        ))
      )}
    </div>
  </div>
);

const SkillNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const typedData = data as unknown as GraphNodeData;
  const isTerminalCard = terminalCardTypes.has(typedData.cardType);

  return (
    <div className={`skill-node card-${typedData.cardType} ${selected ? 'selected' : ''}`} style={{ ['--node-tint' as string]: typedData.tint ?? '#eff6ff' }}>
      <div className="skill-node-header">
        <div className="skill-node-header-copy">
          <div className="skill-node-title">{typedData.title}</div>
          <div className="skill-node-summary">{typedData.summary}</div>
        </div>
        <div className="skill-node-meta">
          <span className="skill-node-badge">{typedData.badge ?? typedData.cardType}</span>
          <span className={`skill-node-status ${typedData.status ?? 'idle'}`}>{typedData.status ?? 'idle'}</span>
        </div>
      </div>

      <div className="skill-node-body">
        {typedData.toolName ? (
          <div className="skill-node-tool-name">
            <span className="skill-node-tool-label">Tool</span>
            <span className="skill-node-tool-value">{typedData.toolName}</span>
          </div>
        ) : null}

        <WorkflowLane nodeId={typedData.id} cardType={typedData.cardType} outputs={typedData.flowOutputs} terminal={isTerminalCard} />
      </div>
    </div>
  );
};

export default SkillNodeComponent;
