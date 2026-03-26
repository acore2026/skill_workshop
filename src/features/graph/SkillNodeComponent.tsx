import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { DataPort, NextActionPort, SkillNode } from '../../schemas/skill';
import './SkillNodeComponent.css';

interface GraphNodeData {
  id: string;
  cardType: SkillNode['cardType'];
  title: string;
  summary: string;
  badge?: string;
  tint?: string;
  sbi?: SkillNode['sbi'];
  inputs: DataPort[];
  outputs: DataPort[];
  nextActions: NextActionPort[];
  properties: SkillNode['properties'];
  status?: string;
  onUpdateNode: (id: string, updates: Partial<SkillNode>) => void;
}

const handleId = (portId: string, side: 'source' | 'target') => `${portId}::${side}`;

const DataLane: React.FC<{
  title: string;
  ports: DataPort[];
  side: Position.Left | Position.Right;
}> = ({ title, ports, side }) => (
  <div className={`lane-block ${side === Position.Left ? 'left' : 'right'}`}>
    <div className="lane-title">{title}</div>
    <div className="lane-list">
      {ports.length === 0 ? (
        <div className="lane-empty">none</div>
      ) : (
        ports.map((port) => (
          <div key={port.id} className="lane-row">
            {side === Position.Left && (
              <Handle
                id={handleId(port.id, 'target')}
                type="target"
                position={Position.Left}
                className="node-handle data-handle input-handle"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              />
            )}
            <div className="lane-copy">
              <span className="lane-name">{port.name}</span>
              <span className="lane-type">{port.dataType}</span>
            </div>
            {side === Position.Right && (
              <Handle
                id={handleId(port.id, 'source')}
                type="source"
                position={Position.Right}
                className="node-handle data-handle output-handle"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              />
            )}
          </div>
        ))
      )}
    </div>
  </div>
);

const ConstantEditor: React.FC<{ data: GraphNodeData }> = ({ data }) => {
  const valueType = String(data.properties.valueType ?? 'string');
  const rawValue = data.properties.value;

  return (
    <div className="card-inline-editor">
      <div className="inline-editor-row">
        <label>Type</label>
        <select
          value={valueType}
          onChange={(event) => {
            const nextType = event.target.value as 'string' | 'number' | 'boolean';
            const nextValue =
              nextType === 'number' ? 0 : nextType === 'boolean' ? false : '';
            data.onUpdateNode(data.id, {
              properties: {
                ...data.properties,
                valueType: nextType,
                value: nextValue,
              },
              outputs: data.outputs.map((port, index) =>
                index === 0 ? { ...port, dataType: nextType, defaultValue: nextValue } : port,
              ),
            });
          }}
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
        </select>
      </div>

      <div className="inline-editor-row">
        <label>Value</label>
        {valueType === 'boolean' ? (
          <select
            value={String(Boolean(rawValue))}
            onChange={(event) => {
              const nextValue = event.target.value === 'true';
              data.onUpdateNode(data.id, {
                properties: {
                  ...data.properties,
                  value: nextValue,
                },
                outputs: data.outputs.map((port, index) =>
                  index === 0 ? { ...port, defaultValue: nextValue } : port,
                ),
              });
            }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            type={valueType === 'number' ? 'number' : 'text'}
            value={rawValue === undefined || rawValue === null ? '' : String(rawValue)}
            onChange={(event) => {
              const nextValue = valueType === 'number' ? Number(event.target.value || 0) : event.target.value;
              data.onUpdateNode(data.id, {
                properties: {
                  ...data.properties,
                  value: nextValue,
                },
                outputs: data.outputs.map((port, index) =>
                  index === 0 ? { ...port, defaultValue: nextValue } : port,
                ),
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

const UserDataEditor: React.FC<{ data: GraphNodeData }> = ({ data }) => (
  <div className="card-inline-editor userdata-editor">
    {data.outputs.map((port) => (
      <div key={port.id} className="inline-editor-row compact">
        <label>{port.name}</label>
        <input
          value={String(data.properties[port.name] ?? '')}
          onChange={(event) =>
            data.onUpdateNode(data.id, {
              properties: {
                ...data.properties,
                [port.name]: event.target.value,
              },
            })
          }
        />
      </div>
    ))}
  </div>
);

const NextActionLane: React.FC<{ ports: NextActionPort[] }> = ({ ports }) => (
  <div className="next-lane">
    <div className="lane-title">Action Flow</div>
    <div className="next-list">
      {ports.map((port) => (
        <div key={port.id} className="next-row">
          <Handle
            id={handleId(port.id, 'target')}
            type="target"
            position={Position.Left}
            className="node-handle next-handle"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          />
          <div className="next-label">{port.label}</div>
          {port.mode === 'inout' ? (
            <Handle
              id={handleId(port.id, 'source')}
              type="source"
              position={Position.Right}
              className="node-handle next-handle"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
          ) : (
            <span className="next-terminal">terminal</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

const SkillNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const typedData = data as unknown as GraphNodeData;

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
      {typedData.sbi && (
        <div className="skill-node-sbi">
          <span>{typedData.sbi.service}</span>
          <span>{typedData.sbi.method}</span>
          <span>{typedData.sbi.operation}</span>
        </div>
      )}

      <div className="skill-node-body">
        <DataLane title="Inputs" ports={typedData.inputs} side={Position.Left} />
        <DataLane title="Outputs" ports={typedData.outputs} side={Position.Right} />
      </div>

      {typedData.cardType === 'constant' && <ConstantEditor data={typedData} />}
      {typedData.cardType === 'userdata' && <UserDataEditor data={typedData} />}

      <NextActionLane ports={typedData.nextActions} />
    </div>
  );
};

export default SkillNodeComponent;
