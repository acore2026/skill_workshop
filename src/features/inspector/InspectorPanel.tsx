import React from 'react';
import Button from '../../components/Button';
import { useStore } from '../../store/useStore';
import type { SkillEdge, SkillNode, SkillNodeType } from '../../schemas/skill';
import './InspectorPanel.css';

const InspectorPanel: React.FC = () => {
  const {
    document,
    selectedNodeId,
    selectedEdgeId,
    updateNode,
    updateEdge,
    updateDocument,
    removeNode,
    removeEdge,
  } = useStore();

  const selectedNode = document?.nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = document?.edges.find((edge) => edge.id === selectedEdgeId);

  if (!document) {
    return null;
  }

  const renderNodeDetails = (node: SkillNode) => (
    <div className="inspector-content">
      <div className="inspector-title-block">
        <div className="inspector-eyebrow">Node</div>
        <h3>{node.title}</h3>
        <p>{node.subtitle ?? 'Compact node card with externalized details.'}</p>
      </div>

      <div className="inspector-section">
        <label>Title</label>
        <input value={node.title} onChange={(e) => updateNode(node.id, { title: e.target.value })} />
      </div>

      <div className="inspector-section">
        <label>Subtitle</label>
        <input
          value={node.subtitle ?? ''}
          onChange={(e) => updateNode(node.id, { subtitle: e.target.value || undefined })}
        />
      </div>

      <div className="inspector-section">
        <label>Type</label>
        <select
          value={node.type}
          onChange={(e) => updateNode(node.id, { type: e.target.value as SkillNodeType })}
        >
          <option value="entry">Entry</option>
          <option value="action">Action</option>
          <option value="branch">Branch</option>
          <option value="pure">Pure</option>
          <option value="parameter">Parameter</option>
          <option value="output">Output</option>
          <option value="subgraph">Subgraph</option>
          <option value="annotation">Annotation</option>
          <option value="reroute">Reroute</option>
        </select>
      </div>

      <div className="inspector-section">
        <label>Properties (JSON)</label>
        <textarea
          rows={8}
          value={JSON.stringify(node.properties, null, 2)}
          onChange={(e) => {
            try {
              updateNode(node.id, { properties: JSON.parse(e.target.value) });
            } catch {
              // Ignore transient parse failures while typing.
            }
          }}
        />
      </div>

      <div className="inspector-section">
        <label>Input Defaults</label>
        <div className="pin-detail-list">
          {node.inputs.length === 0 ? (
            <div className="inspector-empty">No input pins.</div>
          ) : (
            node.inputs.map((pin) => (
              <div key={pin.id} className="pin-detail-row">
                <div>
                  <strong>{pin.name}</strong>
                  <span>{pin.dataType}</span>
                </div>
                <input
                  value={pin.defaultValue === undefined || pin.defaultValue === null ? '' : String(pin.defaultValue)}
                  onChange={(e) =>
                    updateNode(node.id, {
                      inputs: node.inputs.map((item) =>
                        item.id === pin.id
                          ? {
                              ...item,
                              defaultValue: e.target.value || undefined,
                            }
                          : item,
                      ),
                    })
                  }
                  placeholder={pin.optional ? 'Optional' : 'Required'}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="inspector-actions">
        <Button size="sm" variant="danger" onClick={() => removeNode(node.id)}>
          Delete Node
        </Button>
      </div>
    </div>
  );

  const renderEdgeDetails = (edge: SkillEdge) => (
    <div className="inspector-content">
      <div className="inspector-title-block">
        <div className="inspector-eyebrow">Wire</div>
        <h3>{edge.edgeType} connection</h3>
        <p>
          {edge.fromNodeId} → {edge.toNodeId}
        </p>
      </div>

      <div className="inspector-section">
        <label>Label</label>
        <input value={edge.label ?? ''} onChange={(e) => updateEdge(edge.id, { label: e.target.value || undefined })} />
      </div>

      <div className="inspector-section">
        <label>Wire Type</label>
        <input value={edge.edgeType} disabled />
      </div>

      <div className="inspector-section">
        <label>Endpoints</label>
        <textarea
          rows={4}
          disabled
          value={JSON.stringify(
            {
              fromNodeId: edge.fromNodeId,
              fromPinId: edge.fromPinId,
              toNodeId: edge.toNodeId,
              toPinId: edge.toPinId,
            },
            null,
            2,
          )}
        />
      </div>

      <div className="inspector-actions">
        <Button size="sm" variant="danger" onClick={() => removeEdge(edge.id)}>
          Delete Wire
        </Button>
      </div>
    </div>
  );

  if (selectedNode) {
    return renderNodeDetails(selectedNode);
  }

  if (selectedEdge) {
    return renderEdgeDetails(selectedEdge);
  }

  return (
    <div className="inspector-content">
      <div className="inspector-title-block">
        <div className="inspector-eyebrow">Graph</div>
        <h3>{document.name}</h3>
        <p>{document.metadata.description}</p>
      </div>

      <div className="inspector-section">
        <label>Name</label>
        <input value={document.name} onChange={(e) => updateDocument({ name: e.target.value })} />
      </div>

      <div className="inspector-section">
        <label>Description</label>
        <textarea
          rows={4}
          value={document.metadata.description}
          onChange={(e) =>
            updateDocument({
              metadata: {
                ...document.metadata,
                description: e.target.value,
              },
            })
          }
        />
      </div>

      <div className="inspector-section">
        <label>Tags</label>
        <input
          value={document.metadata.tags.join(', ')}
          onChange={(e) =>
            updateDocument({
              metadata: {
                ...document.metadata,
                tags: e.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              },
            })
          }
        />
      </div>

      <div className="inspector-section">
        <label>Execution Mode</label>
        <input
          value={document.metadata.executionMode}
          onChange={(e) =>
            updateDocument({
              metadata: {
                ...document.metadata,
                executionMode: e.target.value,
              },
            })
          }
        />
      </div>

      <div className="inspector-section compact">
        <div className="inspector-metric">
          <span>Nodes</span>
          <strong>{document.nodes.length}</strong>
        </div>
        <div className="inspector-metric">
          <span>Wires</span>
          <strong>{document.edges.length}</strong>
        </div>
        <div className="inspector-metric">
          <span>Groups</span>
          <strong>{document.groups.length}</strong>
        </div>
      </div>
    </div>
  );
};

export default InspectorPanel;
