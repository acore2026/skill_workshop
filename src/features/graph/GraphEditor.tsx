import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Wrench, X } from 'lucide-react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Connection, Edge, EdgeMouseHandler, Node, NodeMouseHandler, NodeTypes, OnNodeDrag, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../../store/useStore';
import type { SkillNode, WorkflowOutput } from '../../schemas/skill';
import SkillNodeComponent from './SkillNodeComponent';
import './GraphEditor.css';

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

const nodeTypes: NodeTypes = {
  actionCard: SkillNodeComponent,
};

const handleId = (portId: string, side: 'source' | 'target') => `${portId}::${side}`;
const basePortId = (handle: string) => handle.split('::')[0];

const GraphCanvas: React.FC = () => {
  const {
    document,
    fitViewVersion,
    selectNode,
    selectEdge,
    updateNode,
    connectPorts,
    removeEdge,
    addCardOfType,
    addToolStep,
    toolCatalog,
    loadToolCatalog,
  } = useStore();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [toolDrawerOpen, setToolDrawerOpen] = useState(false);
  const [toolQuery, setToolQuery] = useState('');

  useEffect(() => {
    if (toolCatalog.length === 0) {
      void loadToolCatalog();
    }
  }, [toolCatalog.length, loadToolCatalog]);

  const initialNodes = useMemo(
    () =>
      document?.nodes.map((node) => ({
        id: node.id,
        type: 'actionCard',
        position: node.position,
        data: {
          id: node.id,
          cardType: node.cardType,
          title: node.title,
          summary: node.summary,
          badge: node.uiState.badge,
          tint: node.uiState.tint,
          toolName: typeof node.properties.tool_name === 'string' ? node.properties.tool_name : undefined,
          flowOutputs: node.flowOutputs,
          status: document.execution.nodeStatuses[node.id],
          onUpdateNode: updateNode,
        } satisfies GraphNodeData,
      })) ?? [],
    [document, updateNode],
  );

  const initialEdges = useMemo(
    () =>
      document?.edges
        .map((edge) => ({
        id: edge.id,
        source: edge.fromNodeId,
        sourceHandle: handleId(edge.fromOutputId, 'source'),
        target: edge.toNodeId,
        targetHandle: handleId(edge.toNodeId, 'target'),
        label: edge.label,
        animated: edge.style.animated,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          stroke: edge.style.stroke,
          strokeWidth: 2.8,
        },
        labelStyle: {
          fontSize: 11,
          fontWeight: 700,
          fill: '#64748b',
        },
      })) ?? [],
    [document],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges as Edge[]);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  useEffect(() => {
    flowInstance?.fitView({ padding: 0.18, duration: 300 });
  }, [fitViewVersion, flowInstance]);

  const filteredTools = useMemo(() => {
    const normalizedQuery = toolQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return toolCatalog;
    }
    return toolCatalog.filter((tool) =>
      tool.name.toLowerCase().includes(normalizedQuery) ||
      tool.description.toLowerCase().includes(normalizedQuery) ||
      tool.parameters.some((parameter) => parameter.name.toLowerCase().includes(normalizedQuery)),
    );
  }, [toolCatalog, toolQuery]);

  const onNodeDragStop: OnNodeDrag<Node> = useCallback((_, node) => {
    updateNode(node.id, { position: node.position });
  }, [updateNode]);

  const onConnect = (params: Connection) => {
    if (!params.sourceHandle || !params.targetHandle) {
      return;
    }
    connectPorts(basePortId(params.sourceHandle), basePortId(params.targetHandle));
  };

  const onNodeClick: NodeMouseHandler<Node> = useCallback((_, node) => selectNode(node.id), [selectNode]);
  const onEdgeClick: EdgeMouseHandler<Edge> = useCallback((_, edge) => selectEdge(edge.id), [selectEdge]);
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  if (!document) {
    return <div className="graph-empty-state">No graph loaded.</div>;
  }

  return (
    <div className="graph-editor">
      <div className="graph-editor-chrome">
        <div>
          <div className="graph-editor-title">{document.name}</div>
          <div className="graph-editor-subtitle">{document.metadata.description}</div>
        </div>
        <div className="graph-editor-quick-add">
          <button type="button" onClick={() => setToolDrawerOpen((current) => !current)}>
            <Wrench size={13} />
            Tools
          </button>
          <button type="button" onClick={() => addCardOfType('branch')}>+ Branch</button>
          <button type="button" onClick={() => addCardOfType('loop')}>+ Loop</button>
          <button type="button" onClick={() => addCardOfType('parallel')}>+ Parallel</button>
          <button type="button" onClick={() => addCardOfType('success')}>+ Done</button>
          <button type="button" onClick={() => addCardOfType('failure')}>+ Abort</button>
        </div>
        <div className="graph-editor-stats">
          <span>{document.nodes.length} steps</span>
          <span>{document.edges.length} flow links</span>
          <span>workflow editor</span>
        </div>
      </div>

      {toolDrawerOpen ? (
        <div className="graph-tool-drawer">
          <div className="graph-tool-drawer-header">
            <div>
              <div className="graph-tool-drawer-title">Real Tools</div>
              <div className="graph-tool-drawer-subtitle">Insert tool-bound steps into the workflow.</div>
            </div>
            <button type="button" className="graph-tool-drawer-close" onClick={() => setToolDrawerOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <label className="graph-tool-search">
            <Search size={14} />
            <input value={toolQuery} onChange={(event) => setToolQuery(event.target.value)} placeholder="Search tools or parameters" />
          </label>
          <div className="graph-tool-list">
            {filteredTools.map((tool) => (
              <div key={tool.name} className="graph-tool-card">
                <div className="graph-tool-card-title">{tool.name}</div>
                <p>{tool.description}</p>
                <div className="graph-tool-card-meta">
                  <span>{tool.parameters.length} params</span>
                  <button
                    type="button"
                    onClick={() => {
                      addToolStep(tool.name);
                      setToolDrawerOpen(false);
                      setToolQuery('');
                    }}
                  >
                    Add Step
                  </button>
                </div>
              </div>
            ))}
            {filteredTools.length === 0 ? <div className="graph-tool-empty">No tools matched that search.</div> : null}
          </div>
        </div>
      ) : null}

      <ReactFlow
        onInit={setFlowInstance}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onEdgesDelete={(deleted) => deleted.forEach((edge) => removeEdge(edge.id))}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.35}
        maxZoom={1.6}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background variant={BackgroundVariant.Lines} gap={24} color="#e2e8f0" />
        <Background variant={BackgroundVariant.Lines} gap={120} color="#cbd5e1" />
        <Controls showInteractive={false} className="graph-controls" />
      </ReactFlow>
    </div>
  );
};

const GraphEditor: React.FC = () => <GraphCanvas key="action-graph-canvas" />;

export default GraphEditor;
