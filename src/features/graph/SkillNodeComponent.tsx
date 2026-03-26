import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { SkillNodeType, SkillPin } from '../../schemas/skill';
import './SkillNodeComponent.css';

interface GraphNodeData {
  title: string;
  subtitle?: string;
  type: SkillNodeType;
  badge?: string;
  tint?: string;
  inputs: SkillPin[];
  outputs: SkillPin[];
  status?: string;
}

const PinRail: React.FC<{ pins: SkillPin[]; position: Position }> = ({ pins, position }) => (
  <div className={`pin-rail ${position === Position.Left ? 'left' : 'right'}`}>
    {pins.map((pin) => (
      <div key={pin.id} className={`pin-row pin-${pin.pinKind}`}>
        {position === Position.Left && (
          <Handle
            id={pin.id}
            type="target"
            position={Position.Left}
            className={`node-handle pin-kind-${pin.pinKind}`}
          />
        )}
        <div className="pin-text">
          <span className="pin-name">{pin.name}</span>
          <span className="pin-type">{pin.dataType}</span>
        </div>
        {position === Position.Right && (
          <Handle
            id={pin.id}
            type="source"
            position={Position.Right}
            className={`node-handle pin-kind-${pin.pinKind}`}
          />
        )}
      </div>
    ))}
  </div>
);

const SkillNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const typedData = data as unknown as GraphNodeData;

  return (
    <div
      className={`skill-node node-${typedData.type} ${selected ? 'selected' : ''}`}
      style={{ ['--node-tint' as string]: typedData.tint ?? '#eff6ff' }}
    >
      <div className="skill-node-header">
        <div>
          <div className="skill-node-title">{typedData.title}</div>
          {typedData.subtitle && <div className="skill-node-subtitle">{typedData.subtitle}</div>}
        </div>
        {typedData.badge && <span className="skill-node-badge">{typedData.badge}</span>}
      </div>

      <div className="skill-node-body">
        <PinRail pins={typedData.inputs} position={Position.Left} />
        <div className="skill-node-center">
          <div className="skill-node-type">{typedData.type.replace('_', ' ')}</div>
          <div className={`skill-node-status ${typedData.status ?? 'idle'}`}>{typedData.status ?? 'idle'}</div>
        </div>
        <PinRail pins={typedData.outputs} position={Position.Right} />
      </div>
    </div>
  );
};

export default SkillNodeComponent;
