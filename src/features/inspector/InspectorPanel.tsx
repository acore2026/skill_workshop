import React from 'react';
import Button from '../../components/Button';
import { useStore } from '../../store/useStore';
import type { CardType, SkillNode } from '../../schemas/skill';
import './InspectorPanel.css';

const cardOptions: CardType[] = [
  'action',
  'branch',
  'loop',
  'parallel',
  'success',
  'failure',
  'constant',
  'user_container',
  'device_container',
  'network_container',
  'app_container',
];

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, subtitle, children }) => (
  <section className="inspector-card">
    <div className="inspector-card-header">
      <div className="inspector-card-title">{title}</div>
      {subtitle ? <div className="inspector-card-subtitle">{subtitle}</div> : null}
    </div>
    <div className="inspector-card-body">{children}</div>
  </section>
);

const renderPortSummary = (node: SkillNode) => {
  if (node.cardType === 'success' || node.cardType === 'failure') {
    return (
      <>
        <div className="inspector-stat">
          <span>Terminal</span>
          <strong>Yes</strong>
        </div>
        <div className="inspector-stat">
          <span>Inputs</span>
          <strong>0</strong>
        </div>
        <div className="inspector-stat">
          <span>Outputs</span>
          <strong>0</strong>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="inspector-stat">
        <span>Inputs</span>
        <strong>{node.inputs.length}</strong>
      </div>
      <div className="inspector-stat">
        <span>Outputs</span>
        <strong>{node.outputs.length}</strong>
      </div>
      <div className="inspector-stat">
        <span>Flow</span>
        <strong>{node.nextActions.length}</strong>
      </div>
    </>
  );
};

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

  if (selectedNode) {
    return (
      <div className="inspector-panel">
        <div className="inspector-body">
          <section className="inspector-hero">
            <div className="inspector-eyebrow">Selected Card</div>
            <div className="inspector-hero-header">
              <div>
                <h3>{selectedNode.title}</h3>
                <p>{selectedNode.summary || 'No summary provided.'}</p>
              </div>
              <span className="inspector-badge">{selectedNode.cardType.replace('_', ' ')}</span>
            </div>
            <div className="inspector-stats">{renderPortSummary(selectedNode)}</div>
          </section>

          <Section title="Overview" subtitle="Core card details">
            <div className="inspector-field-grid">
              <label className="inspector-field">
                <span>Title</span>
                <input value={selectedNode.title} onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })} />
              </label>

              <label className="inspector-field">
                <span>Card Type</span>
                <select
                  value={selectedNode.cardType}
                  onChange={(e) => updateNode(selectedNode.id, { cardType: e.target.value as CardType })}
                >
                  {cardOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="inspector-field">
              <span>Summary</span>
              <textarea
                rows={4}
                value={selectedNode.summary}
                onChange={(e) => updateNode(selectedNode.id, { summary: e.target.value })}
              />
            </label>
          </Section>

          {selectedNode.sbi ? (
            <Section title="Action Configuration" subtitle="Service call definition">
              <label className="inspector-field">
                <span>SBI Action</span>
                <textarea
                  rows={6}
                  value={JSON.stringify(selectedNode.sbi, null, 2)}
                  onChange={(e) => {
                    try {
                      updateNode(selectedNode.id, { sbi: JSON.parse(e.target.value) });
                    } catch {
                      // Ignore transient parse failures while typing.
                    }
                  }}
                />
              </label>
            </Section>
          ) : null}

          <Section title="Properties" subtitle="Card metadata">
            <label className="inspector-field">
              <span>Properties (JSON)</span>
              <textarea
                rows={8}
                value={JSON.stringify(selectedNode.properties, null, 2)}
                onChange={(e) => {
                  try {
                    updateNode(selectedNode.id, { properties: JSON.parse(e.target.value) });
                  } catch {
                    // Ignore transient parse failures while typing.
                  }
                }}
              />
            </label>
          </Section>

          {selectedNode.inputs.length > 0 ? (
            <Section title="Inputs" subtitle="Default values and parameter names">
              <div className="inspector-stack">
                {selectedNode.inputs.map((pin) => (
                  <div key={pin.id} className="inspector-list-row">
                    <div className="inspector-row-meta">
                      <strong>{pin.name}</strong>
                      <span>{pin.dataType}</span>
                    </div>
                    <input
                      value={pin.defaultValue === undefined || pin.defaultValue === null ? '' : String(pin.defaultValue)}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          inputs: selectedNode.inputs.map((item) =>
                            item.id === pin.id ? { ...item, defaultValue: e.target.value || undefined } : item,
                          ),
                        })
                      }
                      placeholder={pin.required ? 'Required' : 'Optional'}
                    />
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {selectedNode.nextActions.length > 0 ? (
            <Section title="Action Flow" subtitle="Outgoing flow labels">
              <div className="inspector-stack">
                {selectedNode.nextActions.map((port) => (
                  <div key={port.id} className="inspector-list-row">
                    <div className="inspector-row-meta">
                      <strong>{port.label}</strong>
                      <span>{port.mode}</span>
                    </div>
                    <input
                      value={port.label}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          nextActions: selectedNode.nextActions.map((item) =>
                            item.id === port.id ? { ...item, label: e.target.value || item.label } : item,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <div className="inspector-footer">
            <Button size="sm" variant="danger" onClick={() => removeNode(selectedNode.id)}>
              Delete Card
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <div className="inspector-panel">
        <div className="inspector-body">
          <section className="inspector-hero">
            <div className="inspector-eyebrow">Selected Link</div>
            <div className="inspector-hero-header">
              <div>
                <h3>{selectedEdge.edgeType === 'data' ? 'Data Link' : 'Action Flow Link'}</h3>
                <p>
                  {selectedEdge.fromNodeId} → {selectedEdge.toNodeId}
                </p>
              </div>
              <span className="inspector-badge">{selectedEdge.edgeType}</span>
            </div>
            <div className="inspector-stats">
              <div className="inspector-stat">
                <span>Source Port</span>
                <strong>{selectedEdge.fromPortId}</strong>
              </div>
              <div className="inspector-stat">
                <span>Target Port</span>
                <strong>{selectedEdge.toPortId}</strong>
              </div>
            </div>
          </section>

          <Section title="Link Settings" subtitle="Editable connection fields">
            <label className="inspector-field">
              <span>Label</span>
              <input
                value={selectedEdge.label ?? ''}
                onChange={(e) => updateEdge(selectedEdge.id, { label: e.target.value || undefined })}
              />
            </label>

            <label className="inspector-field">
              <span>Link Type</span>
              <input value={selectedEdge.edgeType} disabled />
            </label>
          </Section>

          <Section title="Endpoints" subtitle="Resolved connection mapping">
            <label className="inspector-field">
              <span>Endpoints</span>
              <textarea
                rows={5}
                disabled
                value={JSON.stringify(
                  {
                    fromNodeId: selectedEdge.fromNodeId,
                    fromPortId: selectedEdge.fromPortId,
                    toNodeId: selectedEdge.toNodeId,
                    toPortId: selectedEdge.toPortId,
                  },
                  null,
                  2,
                )}
              />
            </label>
          </Section>

          <div className="inspector-footer">
            <Button size="sm" variant="danger" onClick={() => removeEdge(selectedEdge.id)}>
              Delete Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      <div className="inspector-body">
        <section className="inspector-hero">
          <div className="inspector-eyebrow">Graph Details</div>
          <div className="inspector-hero-header">
            <div>
              <h3>{document.name}</h3>
              <p>{document.metadata.description}</p>
            </div>
            <span className="inspector-badge">live</span>
          </div>
          <div className="inspector-stats">
            <div className="inspector-stat">
              <span>Cards</span>
              <strong>{document.nodes.length}</strong>
            </div>
            <div className="inspector-stat">
              <span>Links</span>
              <strong>{document.edges.length}</strong>
            </div>
            <div className="inspector-stat">
              <span>Mode</span>
              <strong>{document.metadata.executionMode}</strong>
            </div>
          </div>
        </section>

        <Section title="Workspace" subtitle="Skill metadata">
          <label className="inspector-field">
            <span>Name</span>
            <input value={document.name} onChange={(e) => updateDocument({ name: e.target.value })} />
          </label>

          <label className="inspector-field">
            <span>Description</span>
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
          </label>

          <label className="inspector-field">
            <span>Tags</span>
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
          </label>
        </Section>
      </div>
    </div>
  );
};

export default InspectorPanel;
