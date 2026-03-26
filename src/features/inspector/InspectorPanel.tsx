import React from 'react';
import Button from '../../components/Button';
import { useStore } from '../../store/useStore';
import type { CardType, SkillEdge, SkillNode } from '../../schemas/skill';
import './InspectorPanel.css';

const cardOptions: CardType[] = ['action', 'branch', 'loop', 'parallel', 'success', 'failure', 'constant', 'userdata'];

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
        <div className="inspector-eyebrow">Card</div>
        <h3>{node.title}</h3>
        <p>{node.summary}</p>
      </div>

      <div className="inspector-section">
        <label>Title</label>
        <input value={node.title} onChange={(e) => updateNode(node.id, { title: e.target.value })} />
      </div>

      <div className="inspector-section">
        <label>Summary</label>
        <textarea rows={4} value={node.summary} onChange={(e) => updateNode(node.id, { summary: e.target.value })} />
      </div>

      {node.sbi && (
        <div className="inspector-section">
          <label>SBI Action</label>
          <textarea
            rows={5}
            value={JSON.stringify(node.sbi, null, 2)}
            onChange={(e) => {
              try {
                updateNode(node.id, { sbi: JSON.parse(e.target.value) });
              } catch {
                // Ignore transient parse failures while typing.
              }
            }}
          />
        </div>
      )}

      <div className="inspector-section">
        <label>Card Type</label>
        <select value={node.cardType} onChange={(e) => updateNode(node.id, { cardType: e.target.value as CardType })}>
          {cardOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
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
        <label>Inputs</label>
        <div className="pin-detail-list">
          {node.inputs.map((pin) => (
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
                      item.id === pin.id ? { ...item, defaultValue: e.target.value || undefined } : item,
                    ),
                  })
                }
                placeholder={pin.required ? 'Required' : 'Optional'}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="inspector-section">
        <label>Action Flow Labels</label>
        <div className="pin-detail-list">
          {node.nextActions.map((port) => (
            <div key={port.id} className="pin-detail-row">
              <div>
                <strong>{port.label}</strong>
                <span>{port.mode}</span>
              </div>
              <input
                value={port.label}
                onChange={(e) =>
                  updateNode(node.id, {
                    nextActions: node.nextActions.map((item) =>
                      item.id === port.id ? { ...item, label: e.target.value || item.label } : item,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="inspector-actions">
        <Button size="sm" variant="danger" onClick={() => removeNode(node.id)}>
          Delete Card
        </Button>
      </div>
    </div>
  );

  const renderEdgeDetails = (edge: SkillEdge) => (
    <div className="inspector-content">
      <div className="inspector-title-block">
        <div className="inspector-eyebrow">Link</div>
        <h3>{edge.edgeType === 'data' ? 'Data Link' : 'Action Flow Link'}</h3>
        <p>
          {edge.fromNodeId} → {edge.toNodeId}
        </p>
      </div>

      <div className="inspector-section">
        <label>Label</label>
        <input value={edge.label ?? ''} onChange={(e) => updateEdge(edge.id, { label: e.target.value || undefined })} />
      </div>

      <div className="inspector-section">
        <label>Link Type</label>
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
              fromPortId: edge.fromPortId,
              toNodeId: edge.toNodeId,
              toPortId: edge.toPortId,
            },
            null,
            2,
          )}
        />
      </div>

      <div className="inspector-actions">
        <Button size="sm" variant="danger" onClick={() => removeEdge(edge.id)}>
          Delete Link
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
                tags: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
              },
            })
          }
        />
      </div>

      <div className="inspector-section compact">
        <div className="inspector-metric">
          <span>Cards</span>
          <strong>{document.nodes.length}</strong>
        </div>
        <div className="inspector-metric">
          <span>Links</span>
          <strong>{document.edges.length}</strong>
        </div>
        <div className="inspector-metric">
          <span>Source</span>
          <strong>Live</strong>
        </div>
      </div>
    </div>
  );
};

export default InspectorPanel;
