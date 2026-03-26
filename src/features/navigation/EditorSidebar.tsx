import React from 'react';
import { Boxes, FileStack, Plus, Sparkles } from 'lucide-react';
import Button from '../../components/Button';
import { CARD_LIBRARY, CASE_LIBRARY } from '../../lib/graph';
import { useStore } from '../../store/useStore';
import type { SkillNode } from '../../schemas/skill';
import './EditorSidebar.css';

const groupCards = (nodes: SkillNode[]) =>
  Object.entries(
    nodes.reduce<Record<string, SkillNode[]>>((acc, node) => {
      acc[node.cardType] = acc[node.cardType] ?? [];
      acc[node.cardType].push(node);
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
    addCardOfType,
    addCaseToDocument,
  } = useStore();

  if (!document) {
    return null;
  }

  return (
    <div className="editor-sidebar">
      <div className="editor-sidebar-tabs">
        <button type="button" className={sidebarTab === 'outline' ? 'is-active' : ''} onClick={() => setSidebarTab('outline')}>
          <FileStack size={14} />
          Outline
        </button>
        <button type="button" className={sidebarTab === 'library' ? 'is-active' : ''} onClick={() => setSidebarTab('library')}>
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
              <div className="graph-summary-meta">{document.metadata.executionMode}</div>
              <div className="graph-summary-stats">
                <span>{document.nodes.length} cards</span>
                <span>{document.edges.length} links</span>
                <span>{document.metadata.tags.length} tags</span>
              </div>
            </div>
          </section>

          <section className="sidebar-section">
            <div className="sidebar-section-label">Cards</div>
            {groupCards(document.nodes).map(([groupName, nodes]) => (
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
                      <span>{node.inputs.length + node.outputs.length + node.nextActions.length} lanes</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="sidebar-section">
            <div className="sidebar-section-label">Saved Flows</div>
            <div className="outline-list">
              {CASE_LIBRARY.map((item) => (
                <div key={item.id} className="outline-item static">
                  <span>{item.title}</span>
                  <span>{item.tags.join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="editor-sidebar-body library-mode">
          <section className="sidebar-section">
            <div className="sidebar-section-label">Flow Templates</div>
            <div className="library-stack">
              {CASE_LIBRARY.map((item) => (
                <div key={item.id} className="library-card">
                  <div className="library-card-head">
                    <div>
                      <div className="library-card-title">{item.title}</div>
                      <div className="library-card-subtitle">Template</div>
                    </div>
                    <span className="library-card-badge">{item.tags[0]}</span>
                  </div>
                  <p>{item.summary}</p>
                  <div className="library-card-footer">
                    <span>{item.cards.length} cards</span>
                    <Button type="button" size="sm" variant="secondary" onClick={() => addCaseToDocument(item.id)}>
                      <Plus size={12} />
                      Insert
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sidebar-section">
            <div className="sidebar-section-label">Card Palette</div>
            <div className="library-stack">
              {CARD_LIBRARY.map((template) => (
                <div key={template.id} className="library-card">
                  <div className="library-card-head">
                    <div>
                      <div className="library-card-title">{template.title}</div>
                      <div className="library-card-subtitle">{template.cardType}</div>
                    </div>
                    <span className="library-card-badge" style={{ backgroundColor: template.tint }}>
                      {template.badge}
                    </span>
                  </div>
                  <p>{template.summary}</p>
                  <div className="library-card-footer">
                    <span>
                      {template.inputs.length} inputs / {template.outputs.length} outputs / {template.nextActions.length} next
                    </span>
                    <Button type="button" size="sm" variant="secondary" onClick={() => addCardOfType(template.cardType)}>
                      <Plus size={12} />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sidebar-section tip-card">
            <div className="sidebar-section-label">Generator</div>
            <div className="tip-content">
              <Sparkles size={16} />
              <span>Use the left generator to update the flow, or add cards directly from the canvas controls.</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default EditorSidebar;
