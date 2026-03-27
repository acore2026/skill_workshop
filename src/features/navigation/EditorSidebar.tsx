import React from 'react';
import { Boxes, FileStack, Plus } from 'lucide-react';
import Button from '../../components/Button';
import { CARD_LIBRARY } from '../../lib/graph';
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

        </div>
      ) : (
        <div className="editor-sidebar-body library-mode">
          <section className="sidebar-section">
            <div className="sidebar-section-label">Card Library</div>
            <div className="library-stack">
              {CARD_LIBRARY.map((template) => (
                <div key={template.id} className="library-card">
                  <div className="library-card-title">{template.title}</div>
                  <p>{template.summary}</p>
                  <div className="library-card-footer">
                    <Button type="button" size="sm" variant="secondary" onClick={() => addCardOfType(template.cardType)}>
                      <Plus size={12} />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default EditorSidebar;
