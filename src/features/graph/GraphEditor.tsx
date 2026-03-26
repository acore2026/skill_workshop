import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge as addFlowEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  Node,
  NodeMouseHandler,
  EdgeMouseHandler,
  OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../../store/useStore';
import SkillNodeComponent from './SkillNodeComponent';
import './GraphEditor.css';

const nodeTypes = {
  intent: SkillNodeComponent,
  discovery: SkillNodeComponent,
  skill: SkillNodeComponent,
  directive: SkillNodeComponent,
  execution: SkillNodeComponent,
};

const GraphEditor: React.FC = () => {
  const { document, selectNode, selectEdge, updateNode, addEdge } = useStore();

  const initialNodes = useMemo(() => 
    document?.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: { label: node.label, type: node.type },
    })) || []
  , [document?.nodes]);

  const initialEdges = useMemo(() => 
    document?.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })) || []
  , [document?.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes from state back to store when they move
  const onNodeDragStop: OnNodeDrag<Node> = useCallback((_, node) => {
    updateNode(node.id, { position: node.position });
  }, [updateNode]);

  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
      id: `edge-${params.source}-${params.target}`,
      source: params.source || '',
      target: params.target || '',
      sourceHandle: params.sourceHandle || undefined,
      targetHandle: params.targetHandle || undefined,
    };
    addEdge(newEdge);
    setEdges((eds) => addFlowEdge(params, eds));
  }, [addEdge, setEdges]);

  const onNodeClick: NodeMouseHandler<Node> = useCallback((_, node) => {
    selectNode(node.id);
  }, [selectNode]);

  const onEdgeClick: EdgeMouseHandler<Edge> = useCallback((_, edge) => {
    selectEdge(edge.id);
  }, [selectEdge]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Update flow nodes when document nodes change (e.g. from generator)
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  if (!document) {
    return (
      <div className="graph-empty-state">
        <p>No document active. Submit a prompt to generate a graph.</p>
      </div>
    );
  }

  return (
    <div className="graph-editor">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#f0f0f0" gap={20} />
        <Controls />
        <Panel position="top-right" className="graph-panel">
          <div className="graph-stats">
            <span>{document.nodes.length} Nodes</span>
            <span>{document.edges.length} Edges</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default GraphEditor;
