import React, { useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
} from '@xyflow/react';
import { 
  Cpu, Database, Router, Shield, 
  Smartphone, Bot, Info, X, Globe, Layout, Glasses
} from 'lucide-react';
import { ARCHITECTURE_NODES, ARCHITECTURE_EDGES, type ArchitectureNodeData } from '../../lib/architectureData';
import '@xyflow/react/dist/style.css';
import './ArchitectureGraph.css';

// --- CUSTOM NODE COMPONENT ---

const NodeIcon: React.FC<{ type: ArchitectureNodeData['type']; label?: string }> = ({ type, label = '' }) => {
  const labelLower = label.toLowerCase();
  
  switch (type) {
    case 'ue': 
      if (labelLower.includes('phone')) return <Smartphone size={18} />;
      if (labelLower.includes('robot')) return <Bot size={18} />;
      if (labelLower.includes('glasses')) return <Glasses size={18} />;
      return <Smartphone size={18} />;
    case 'app': return <Layout size={18} />;
    case 'ran': return <Router size={18} />;
    case 'core': return <Cpu size={18} />;
    case 'registry': return <Database size={18} />;
    case 'agent': return <Bot size={18} />;
    case 'gateway': return <Globe size={18} />;
    default: return <Shield size={18} />;
  }
};

const ArchitectureNode: React.FC<{ data: ArchitectureNodeData; selected?: boolean }> = ({ data, selected }) => {
  if (data.type === 'domain') {
    return (
      <div className="arch-domain-label-container">
        <div className="arch-domain-header">
          {data.label === 'DEVICE DOMAIN' && <Smartphone size={14} />}
          {data.label === 'APP DOMAIN' && <Layout size={14} />}
          {data.label === 'NETWORK DOMAIN' && <Globe size={14} />}
          <span>{data.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`arch-node arch-node-${data.type} ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div className="arch-node-icon">
        <NodeIcon type={data.type} label={data.label} />
      </div>
      <div className="arch-node-label">{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
};

const nodeTypes = {
  architectureNode: ArchitectureNode,
};

// --- MAIN COMPONENT ---

const ArchitectureGraph: React.FC = () => {
  const [nodes, , onNodesChange] = useNodesState(ARCHITECTURE_NODES);
  const [edges, , onEdgesChange] = useEdgesState(ARCHITECTURE_EDGES);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNodeData | null>(null);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as ArchitectureNodeData);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  return (
    <div className="arch-graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{ 
          type: 'smoothstep',
          style: { strokeWidth: 2, stroke: '#94a3b8' }
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} color="#e2e8f0" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* INSPECTOR OVERLAY */}
      {selectedNode && (
        <div className="arch-inspector">
          <div className="arch-inspector-header">
            <div className="arch-inspector-title">
              <NodeIcon type={selectedNode.type} label={selectedNode.label} />
              <span>{selectedNode.label}</span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="arch-inspector-close">
              <X size={14} />
            </button>
          </div>
          <div className="arch-inspector-body">
            <p className="arch-inspector-desc">{selectedNode.description}</p>
            {selectedNode.properties && (
              <div className="arch-properties">
                <div className="arch-properties-header">
                  <Info size={12} />
                  <span>Attributes</span>
                </div>
                <div className="arch-properties-grid">
                  {Object.entries(selectedNode.properties).map(([key, val]) => (
                    <React.Fragment key={key}>
                      <div className="arch-prop-key">{key}</div>
                      <div className="arch-prop-val">{val}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEGEND */}
      <div className="arch-legend">
        <div className="arch-legend-item"><div className="arch-dot ue" /> UE</div>
        <div className="arch-legend-item"><div className="arch-dot ran" /> RAN</div>
        <div className="arch-legend-item"><div className="arch-dot core" /> CORE</div>
        <div className="arch-legend-item"><div className="arch-dot agent" /> AGENT</div>
        <div className="arch-legend-item"><div className="arch-dot app" /> APP</div>
        <div className="arch-legend-item"><div className="arch-dot registry" /> REGISTRY</div>
      </div>
    </div>
  );
};

export default ArchitectureGraph;
