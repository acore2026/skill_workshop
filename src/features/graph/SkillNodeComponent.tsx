import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
const dataCardTypes = new Set<SkillNode['cardType']>([
  'constant',
  'user_container',
  'device_container',
  'network_container',
  'app_container',
]);
const terminalCardTypes = new Set<SkillNode['cardType']>(['success', 'failure']);

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

const AttributeEditor: React.FC<{ data: GraphNodeData }> = ({ data }) => {
  const attributes = Object.entries(data.properties);

  const syncAttributes = (entries: Array<[string, unknown]>) => {
    const normalized = entries
      .map(([key, value], index) => [key.trim() || `attribute_${index + 1}`, value] as [string, unknown])
      .filter(([key]) => key.length > 0);

    data.onUpdateNode(data.id, {
      properties: Object.fromEntries(normalized),
      outputs: normalized.map(([key, value], index) => ({
        id: data.outputs[index]?.id ?? `${data.id}-output-${key.toLowerCase().replace(/\s+/g, '-')}`,
        nodeId: data.id,
        direction: 'output',
        name: key,
        dataType: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
        required: false,
        defaultValue: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : String(value ?? ''),
      })),
    });
  };

  return (
    <div className="card-inline-editor attribute-editor">
      <div className="attribute-header">
        <div className="lane-title">Attributes</div>
        <button
          type="button"
          className="attribute-action-btn"
          onClick={() => syncAttributes([...attributes, [`attribute_${attributes.length + 1}`, '']])}
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <div className="attribute-list">
        {attributes.map(([key, value], index) => {
          const port = data.outputs[index];
          return (
            <div key={`${key}-${index}`} className="attribute-row">
              <input
                value={key}
                onChange={(event) => {
                  const nextEntries = [...attributes];
                  nextEntries[index] = [event.target.value, value];
                  syncAttributes(nextEntries);
                }}
                placeholder="Attribute"
                className="attribute-key-input"
              />
              <input
                value={String(value ?? '')}
                onChange={(event) => {
                  const nextEntries = [...attributes];
                  nextEntries[index] = [key, event.target.value];
                  syncAttributes(nextEntries);
                }}
                placeholder="Value"
              />
              {port && (
                <Handle
                  id={handleId(port.id, 'source')}
                  type="source"
                  position={Position.Right}
                  className="node-handle data-handle output-handle"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
              )}
              <button
                type="button"
                className="attribute-icon-btn"
                onClick={() => syncAttributes(attributes.filter((_, entryIndex) => entryIndex !== index))}
                aria-label={`Delete ${key}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  const isDataCard = dataCardTypes.has(typedData.cardType);
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
      {typedData.sbi && (
        <div className="skill-node-sbi">
          <span>{typedData.sbi.service}</span>
          <span>{typedData.sbi.method}</span>
          <span>{typedData.sbi.operation}</span>
        </div>
      )}

      {!isTerminalCard && (
        <div className={`skill-node-body ${isDataCard ? 'data-only' : ''}`}>
          {isDataCard ? null : (
          <>
            <DataLane title="Inputs" ports={typedData.inputs} side={Position.Left} />
            <DataLane title="Outputs" ports={typedData.outputs} side={Position.Right} />
          </>
          )}
        </div>
      )}

      {isDataCard && <AttributeEditor data={typedData} />}

      {!isDataCard && <NextActionLane ports={typedData.nextActions} />}
    </div>
  );
};

export default SkillNodeComponent;
