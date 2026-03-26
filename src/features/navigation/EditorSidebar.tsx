import React from 'react';
import { Boxes, FileStack, Plus, Sparkles } from 'lucide-react';
import Button from '../../components/Button';
import { NODE_LIBRARY, createNodeFromTemplate } from '../../lib/graph';
import { useStore } from '../../store/useStore';
import type { SkillNode } from '../../schemas/skill';
import './EditorSidebar.css';

const groupNodes = (nodes: SkillNode[]) =>
  Object.entries(
    nodes.reduce<Record<string, SkillNode[]>>((acc, node) => {
      const key = node.type.replace('_', ' ');
      acc[key] = acc[key] ?? [];
      acc[key].push(node);
      return acc;
    }, {}),
  );

const EditorSidebar: React.FC = () => {
  const {
    document,
    sidebarTab,
    setSidebarTab,
    selectedNodeId,
    selectNode,
    addNode,
  } = useStore();

  if (!document) {
    return null;
  }

  const handleAddNode = (templateId: string) => {
    const template = NODE_LIBRARY.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const column = document.nodes.length % 3;
    const row = Math.floor(document.nodes.length / 3);
    addNode(
      createNodeFromTemplate(template, {
        x: 220 + column * 240,
        y: 140 + row * 180,
      }),
    );
  };

  return (
    <div className="editor-sidebar">
      <div className="editor-sidebar-tabs">
        <button
          type="button"
          className={sidebarTab === 'outline' ? 'is-active' : ''}
          onClick={() => setSidebarTab('outline')}
        >
          <FileStack size={14} />
          Outline
        </button>
        <button
          type="button"
          className={sidebarTab === 'library' ? 'is-active' : ''}
          onClick={() => setSidebarTab('library')}
        >
          <Boxes size={14} />
          Library
        </button>
      </div>

      {sidebarTab === 'outline' ? (
        <div className="editor-sidebar-body">
          <section className="sidebar-section">
            <div className="sidebar-section-label">Graph</div>
            <div className="graph-summary-card">
              <div className="graph-summary-title">{document.name}</div>
              <div className="graph-summary-meta">{document.type.replace('_', ' ')}</div>
              <div className="graph-summary-stats">
                <span>{document.nodes.length} nodes</span>
                <span>{document.edges.length} wires</span>
                <span>{document.groups.length} groups</span>
              </div>
            </div>
          </section>

          <section className="sidebar-section">
            <div className="sidebar-section-label">Nodes</div>
            {groupNodes(document.nodes).map(([groupName, nodes]) => (
              <div key={groupName} className="outline-group">
                <div className="outline-group-title">{groupName}</div>
                <div className="outline-list">
                  {nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      className={`outline-item ${selectedNodeId === node.id ? 'is-selected' : ''}`}
                      onClick={() => selectNode(node.id)}
                    >
                      <span>{node.title}</span>
                      <span>{node.inputs.length + node.outputs.length} pins</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="sidebar-section">
            <div className="sidebar-section-label">Comment Regions</div>
            <div className="outline-list">
              {document.groups.map((group) => (
                <div key={group.id} className="outline-item static">
                  <span>{group.title}</span>
                  <span>{group.childNodeIds.length} nodes</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="editor-sidebar-body library-mode">
          <section className="sidebar-section">
            <div className="sidebar-section-label">Node Palette</div>
            <div className="library-stack">
              {NODE_LIBRARY.map((template) => (
                <div key={template.id} className="library-card">
                  <div className="library-card-head">
                    <div>
                      <div className="library-card-title">{template.title}</div>
                      <div className="library-card-subtitle">{template.subtitle}</div>
                    </div>
                    <span className="library-card-badge" style={{ backgroundColor: template.tint }}>
                      {template.badge}
                    </span>
                  </div>
                  <p>{template.description}</p>
                  <div className="library-card-footer">
                    <span>
                      {template.inputs.length} in / {template.outputs.length} out
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => handleAddNode(template.id)}>
                      <Plus size={12} />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sidebar-section tip-card">
            <div className="sidebar-section-label">Workflow</div>
            <div className="tip-content">
              <Sparkles size={16} />
              <span>Use Auto Layout after adding a few nodes to keep the graph readable.</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default EditorSidebar;
