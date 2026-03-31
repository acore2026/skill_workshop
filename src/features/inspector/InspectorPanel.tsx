import React, { useEffect } from 'react';
import Button from '../../components/Button';
import { useStore } from '../../store/useStore';
import type { CardType, SkillNode } from '../../schemas/skill';
import { isStartNode } from '../../lib/graph';
import './InspectorPanel.css';

const controlOptions: CardType[] = ['branch', 'loop', 'parallel', 'success', 'failure'];

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
    toolCatalog,
    loadToolCatalog,
  } = useStore();

  useEffect(() => {
    if (toolCatalog.length === 0) {
      void loadToolCatalog();
    }
  }, [toolCatalog.length, loadToolCatalog]);

  const selectedNode = document?.nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = document?.edges.find((edge) => edge.id === selectedEdgeId);

  const applyToolToNode = (node: SkillNode, toolName: string) => {
    const tool = toolCatalog.find((entry) => entry.name === toolName);
    if (!tool) {
      return;
    }
    updateNode(node.id, {
      title: tool.name,
      summary: tool.description,
      properties: {
        ...node.properties,
        tool_name: tool.name,
        parameter_names: tool.parameters.map((parameter) => parameter.name),
      },
    });
  };

  if (!document) {
    return null;
  }

  if (selectedNode) {
    const isActionNode = selectedNode.cardType === 'action';
    const isFixedStartNode = isStartNode(selectedNode);
    const selectedToolName =
      typeof selectedNode.properties.tool_name === 'string' && selectedNode.properties.tool_name.trim()
        ? String(selectedNode.properties.tool_name)
        : selectedNode.title;

    return (
      <div className="inspector-panel">
        <div className="inspector-body">
          <section className="inspector-hero">
            <div className="inspector-eyebrow">Selected Step</div>
            <div className="inspector-hero-header">
              <div>
                <h3>{selectedNode.title}</h3>
                <p>{selectedNode.summary || 'No summary provided.'}</p>
              </div>
              <span className="inspector-badge">{selectedNode.cardType.replace('_', ' ')}</span>
            </div>
            <div className="inspector-stats">
              <div className="inspector-stat">
                <span>Flow Outputs</span>
                <strong>{selectedNode.flowOutputs.length}</strong>
              </div>
              <div className="inspector-stat">
                <span>Type</span>
                <strong>{selectedNode.cardType}</strong>
              </div>
              <div className="inspector-stat">
                <span>Mode</span>
                <strong>{isActionNode ? 'tool step' : 'control step'}</strong>
              </div>
            </div>
          </section>

          <Section title="Overview" subtitle="Workflow step details">
            <div className="inspector-field-grid">
              <label className="inspector-field">
                <span>Title</span>
                <input
                  value={selectedNode.title}
                  disabled={isFixedStartNode}
                  onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
                />
              </label>

              <label className="inspector-field">
                <span>Step Type</span>
                <select
                  value={selectedNode.cardType}
                  disabled={isFixedStartNode}
                  onChange={(e) => updateNode(selectedNode.id, { cardType: e.target.value as CardType })}
                >
                  {isFixedStartNode ? <option value="start">start</option> : <option value="action">action</option>}
                  {controlOptions.map((option) => (
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
                disabled={isFixedStartNode}
                onChange={(e) => updateNode(selectedNode.id, { summary: e.target.value })}
              />
            </label>
            {isFixedStartNode ? <div className="inspector-empty">The start step is fixed and cannot be removed.</div> : null}
          </Section>

          {isActionNode && !isFixedStartNode ? (
            <Section title="Real Tool" subtitle="Bind this step to a catalog tool">
              <label className="inspector-field">
                <span>Tool</span>
                <select value={selectedToolName} onChange={(e) => applyToolToNode(selectedNode, e.target.value)}>
                  <option value="">Select a tool</option>
                  {toolCatalog.map((tool) => (
                    <option key={tool.name} value={tool.name}>
                      {tool.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="inspector-stack">
                {toolCatalog
                  .filter((tool) => tool.name === selectedToolName)
                  .map((tool) => (
                    <div key={tool.name} className="inspector-list-row">
                      <div className="inspector-row-meta">
                        <strong>{tool.name}</strong>
                        <span>{tool.description}</span>
                      </div>
                      <div className="inspector-inline-tags">
                        {tool.parameters.map((parameter) => (
                          <span key={`${tool.name}-${parameter.name}`} className="inspector-tag">
                            {parameter.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </Section>
          ) : null}

          <Section title="Workflow Outputs" subtitle="Outgoing labels for next steps">
              <div className="inspector-stack">
              {selectedNode.flowOutputs.length === 0 ? (
                <div className="inspector-empty">This step has no outgoing flow labels.</div>
              ) : (
                selectedNode.flowOutputs.map((output) => (
                  <div key={output.id} className="inspector-list-row">
                    <div className="inspector-row-meta">
                      <strong>{output.label}</strong>
                      <span>workflow</span>
                    </div>
                    <input
                      value={output.label}
                      disabled={isFixedStartNode}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          flowOutputs: selectedNode.flowOutputs.map((item) =>
                            item.id === output.id ? { ...item, label: e.target.value || item.label } : item,
                          ),
                        })
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </Section>

          {!isFixedStartNode ? (
            <div className="inspector-footer">
              <Button size="sm" variant="danger" onClick={() => removeNode(selectedNode.id)}>
                Delete Step
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <div className="inspector-panel">
        <div className="inspector-body">
          <section className="inspector-hero">
            <div className="inspector-eyebrow">Selected Flow Link</div>
            <div className="inspector-hero-header">
              <div>
                <h3>Workflow Link</h3>
                <p>
                  {selectedEdge.fromNodeId} → {selectedEdge.toNodeId}
                </p>
              </div>
              <span className="inspector-badge">{selectedEdge.kind}</span>
            </div>
          </section>

          <Section title="Link Settings" subtitle="Workflow flow metadata">
            <label className="inspector-field">
              <span>Label</span>
              <input value={selectedEdge.label ?? ''} onChange={(e) => updateEdge(selectedEdge.id, { label: e.target.value || undefined })} />
            </label>

            <label className="inspector-field">
              <span>Type</span>
              <input value={selectedEdge.kind} disabled />
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
          <div className="inspector-eyebrow">Workflow Details</div>
          <div className="inspector-hero-header">
            <div>
              <h3>{document.name}</h3>
              <p>{document.metadata.description}</p>
            </div>
            <span className="inspector-badge">workflow</span>
          </div>
          <div className="inspector-stats">
            <div className="inspector-stat">
              <span>Steps</span>
              <strong>{document.nodes.length}</strong>
            </div>
            <div className="inspector-stat">
              <span>Flow Links</span>
              <strong>{document.edges.length}</strong>
            </div>
            <div className="inspector-stat">
              <span>Mode</span>
              <strong>workflow</strong>
            </div>
          </div>
        </section>

        <Section title="Workspace" subtitle="Workflow metadata">
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
        </Section>
      </div>
    </div>
  );
};

export default InspectorPanel;
