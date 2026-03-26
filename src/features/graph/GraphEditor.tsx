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
import { createEdgeFromPins } from '../../lib/graph';
import type { SkillEdge, SkillNode, SkillPin } from '../../schemas/skill';
import { useStore } from '../../store/useStore';
import SkillNodeComponent from './SkillNodeComponent';
import './GraphEditor.css';

interface GraphNodeData {
  title: string;
  subtitle?: string;
  type: SkillNode['type'];
  badge?: string;
  tint?: string;
  inputs: SkillPin[];
  outputs: SkillPin[];
  status?: string;
}

const nodeTypes: NodeTypes = {
  graphNode: SkillNodeComponent,
};

const GraphCanvas: React.FC = () => {
  const {
    document,
    fitViewVersion,
    selectNode,
    selectEdge,
    updateNode,
    addEdge,
    removeEdge,
  } = useStore();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  const initialNodes = useMemo(
    () =>
      document?.nodes.map((node) => ({
        id: node.id,
        type: 'graphNode',
        position: node.position,
        data: {
          title: node.title,
          subtitle: node.subtitle,
          type: node.type,
          badge: node.uiState.badge,
          tint: node.uiState.tint,
          inputs: node.inputs,
          outputs: node.outputs,
          status: document.execution.nodeStatuses[node.id],
        } satisfies GraphNodeData,
      })) ?? [],
    [document],
  );

  const initialEdges = useMemo(
    () =>
      document?.edges.map((edge) => ({
        id: edge.id,
        source: edge.fromNodeId,
        sourceHandle: edge.fromPinId,
        target: edge.toNodeId,
        targetHandle: edge.toPinId,
        label: edge.label,
        animated: edge.style.animated,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          stroke: edge.style.stroke,
          strokeWidth: edge.edgeType === 'execution' ? 2.6 : 2,
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

  const onNodeDragStop: OnNodeDrag<Node> = useCallback(
    (_, node) => {
      updateNode(node.id, { position: node.position });
    },
    [updateNode],
  );

  const onConnect = (params: Connection) => {
    if (!document || !params.source || !params.sourceHandle || !params.target || !params.targetHandle) {
      return;
    }

    const resolveNodeAndPin = (nodeId: string, pinId: string) => {
      const graphNode = document.nodes.find((item) => item.id === nodeId);
      if (!graphNode) {
        return null;
      }

      const pin = [...graphNode.inputs, ...graphNode.outputs].find((item) => item.id === pinId);
      if (!pin) {
        return null;
      }

      return { graphNode, pin };
    };

    const source = resolveNodeAndPin(params.source, params.sourceHandle);
    const target = resolveNodeAndPin(params.target, params.targetHandle);
    if (!source || !target) {
      return;
    }

    const newEdge: SkillEdge = createEdgeFromPins(source.graphNode, source.pin, target.graphNode, target.pin);
    addEdge(newEdge);
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
        <div className="graph-editor-stats">
          <span>{document.nodes.length} nodes</span>
          <span>{document.edges.length} wires</span>
          <span>{document.groups.length} groups</span>
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

const GraphEditor: React.FC = () => <GraphCanvas key="graph-canvas" />;

export default GraphEditor;
