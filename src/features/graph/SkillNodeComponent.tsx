import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import './SkillNodeComponent.css';

const SkillNodeComponent: React.FC<NodeProps> = ({ data, selected, type }) => {
  return (
    <div className={`skill-node node-${type} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      
      <div className="node-icon">
        {/* Placeholder for icons */}
        {type?.[0].toUpperCase()}
      </div>
      
      <div className="node-content">
        <div className="node-type-label">{type}</div>
        <div className="node-label">{data.label as string}</div>
      </div>

      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default SkillNodeComponent;
