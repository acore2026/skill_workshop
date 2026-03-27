import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { NextActionPort, SkillNode } from '../../schemas/skill';
import SkillNodeComponent from './SkillNodeComponent';
import './GraphEditor.css';

interface GraphNodeData {
  id: string;
  cardType: SkillNode['cardType'];
  title: string;
  summary: string;
  badge?: string;
  tint?: string;
  sbi?: SkillNode['sbi'];
  inputs: SkillNode['inputs'];
  outputs: SkillNode['outputs'];
  nextActions: NextActionPort[];
  properties: SkillNode['properties'];
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
  } = useStore();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

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
          sbi: node.sbi,
          inputs: node.inputs,
          outputs: node.outputs,
          nextActions: node.nextActions,
          properties: node.properties,
          status: document.execution.nodeStatuses[node.id],
          onUpdateNode: updateNode,
        } satisfies GraphNodeData,
      })) ?? [],
    [document, updateNode],
  );

  const initialEdges = useMemo(
    () =>
      document?.edges.map((edge) => ({
        id: edge.id,
        source: edge.fromNodeId,
        sourceHandle: handleId(edge.fromPortId, 'source'),
        target: edge.toNodeId,
        targetHandle: handleId(edge.toPortId, 'target'),
        label: edge.label,
        animated: edge.style.animated,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          stroke: edge.style.stroke,
          strokeWidth: edge.edgeType === 'next_action' ? 2.8 : 2.2,
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
          <button type="button" onClick={() => addCardOfType('action')}>+ Action</button>
          <button type="button" onClick={() => addCardOfType('branch')}>+ Branch</button>
          <button type="button" onClick={() => addCardOfType('parallel')}>+ Parallel</button>
          <button type="button" onClick={() => addCardOfType('constant')}>+ Constant</button>
          <button type="button" onClick={() => addCardOfType('user_container')}>+ User Container</button>
          <button type="button" onClick={() => addCardOfType('device_container')}>+ Device Container</button>
          <button type="button" onClick={() => addCardOfType('network_container')}>+ Network Container</button>
          <button type="button" onClick={() => addCardOfType('app_container')}>+ App Container</button>
        </div>
        <div className="graph-editor-stats">
          <span>{document.nodes.length} cards</span>
          <span>{document.edges.length} links</span>
          <span>{document.metadata.executionMode}</span>
        </div>
      </div>

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
