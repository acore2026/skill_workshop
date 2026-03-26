import React from 'react';
import { useStore } from '../../store/useStore';
import type { SkillNodeType } from '../../schemas/skill';
import Button from '../../components/Button';
import './InspectorPanel.css';

const InspectorPanel: React.FC = () => {
  const { document, selectedNodeId, selectedEdgeId, updateNode, removeNode, removeEdge } = useStore();

  const selectedNode = document?.nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = document?.edges.find((e) => e.id === selectedEdgeId);

  if (!selectedNode && !selectedEdge && document) {
    // Show Unified Agentic Skill Profile
    return (
      <div className="inspector-content">
        <div className="inspector-section">
          <label>Agentic Skill ID (URI)</label>
          <input type="text" value={document.profileHeader?.skillId || ''} disabled className="inspector-input" />
        </div>
        <div className="inspector-section">
          <label>Entity Type</label>
          <input type="text" value={document.profileHeader?.entityType || ''} disabled className="inspector-input" />
        </div>
        <div className="inspector-section">
          <label>Service Class</label>
          <input type="text" value={document.profileHeader?.serviceClass || ''} disabled className="inspector-input" />
        </div>
        <div className="inspector-section">
          <label>AgenticService-URI</label>
          <input type="text" value={document.profileHeader?.agenticServiceUri || ''} disabled className="inspector-input" />
        </div>
        <div className="inspector-section">
          <label>Domain Containers (JSON)</label>
          <textarea 
            value={JSON.stringify(document.domainContainers, null, 2)}
            disabled
            className="inspector-textarea"
            rows={10}
          />
        </div>
      </div>
    );
  }

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="inspector-empty">
        <p>Select a node or edge to inspect properties.</p>
      </div>
    );
  }

  if (selectedNode) {
    return (
      <div className="inspector-content">
        <div className="inspector-section">
          <label>ID</label>
          <input type="text" value={selectedNode.id} disabled className="inspector-input" />
        </div>

        <div className="inspector-section">
          <label>Label</label>
          <input 
            type="text" 
            value={selectedNode.label} 
            onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
            className="inspector-input" 
          />
        </div>

        <div className="inspector-section">
          <label>Type</label>
          <select 
            value={selectedNode.type} 
            onChange={(e) => updateNode(selectedNode.id, { type: e.target.value as SkillNodeType })}
            className="inspector-select"
          >
            <option value="intent">Intent</option>
            <option value="discovery">Discovery (ACRF)</option>
            <option value="skill">Skill URI</option>
            <option value="directive">Service Directive</option>
            <option value="execution">Execution</option>
          </select>
        </div>

        <div className="inspector-section">
          <label>Config (JSON)</label>
          <textarea 
            value={JSON.stringify(selectedNode.config, null, 2)}
            onChange={(e) => {
              try {
                const config = JSON.parse(e.target.value);
                updateNode(selectedNode.id, { config });
              } catch {
                // Ignore invalid JSON while typing
              }
            }}
            className="inspector-textarea"
            rows={8}
          />
        </div>

        <div className="inspector-actions">
          <Button variant="danger" size="sm" onClick={() => removeNode(selectedNode.id)}>
            Delete Node
          </Button>
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <div className="inspector-content">
        <div className="inspector-section">
          <label>ID</label>
          <input type="text" value={selectedEdge.id} disabled className="inspector-input" />
        </div>
        <div className="inspector-section">
          <label>Source</label>
          <input type="text" value={selectedEdge.source} disabled className="inspector-input" />
        </div>
        <div className="inspector-section">
          <label>Target</label>
          <input type="text" value={selectedEdge.target} disabled className="inspector-input" />
        </div>
        
        <div className="inspector-actions">
          <Button variant="danger" size="sm" onClick={() => removeEdge(selectedEdge.id)}>
            Delete Edge
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default InspectorPanel;
