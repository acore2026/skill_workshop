import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, FileStack, Search } from 'lucide-react';
import Button from '../../components/Button';
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
    toolCatalog,
    loadToolCatalog,
    addToolStep,
  } = useStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (toolCatalog.length === 0) {
      void loadToolCatalog();
    }
  }, [toolCatalog.length, loadToolCatalog]);

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return toolCatalog;
    }
    return toolCatalog.filter((tool) =>
      tool.name.toLowerCase().includes(normalizedQuery) ||
      tool.description.toLowerCase().includes(normalizedQuery) ||
      tool.parameters.some((parameter) => parameter.name.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, toolCatalog]);

  if (!document && sidebarTab !== 'library') {
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
          Tools
        </button>
      </div>

      {sidebarTab === 'outline' && document ? (
        <div className="editor-sidebar-body">
          <section className="sidebar-section">
            <div className="sidebar-section-label">Graph</div>
            <div className="graph-summary-card">
              <div className="graph-summary-title">{document.name}</div>
              <div className="graph-summary-meta">{document.metadata.executionMode}</div>
              <div className="graph-summary-stats">
                <span>{document.nodes.length} steps</span>
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
                      <span>{node.flowOutputs.length} exits</span>
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
            <div className="sidebar-section-label">Tool Catalog</div>
            <label className="tool-search-box">
              <Search size={14} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools or parameters" />
            </label>
            <div className="library-stack">
              {filteredTools.map((tool) => (
                <div key={tool.name} className="library-card">
                  <div className="library-card-title">{tool.name}</div>
                  <p>{tool.description}</p>
                  {tool.parameters.length > 0 ? (
                    <div className="tool-parameter-list">
                      {tool.parameters.map((parameter) => (
                        <div key={`${tool.name}-${parameter.name}`} className="tool-parameter-row">
                          <div>
                            <strong>{parameter.name}</strong>
                            <span>{parameter.type}</span>
                          </div>
                          <em>{parameter.required ? 'required' : 'optional'}</em>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="library-card-footer">
                    <Button type="button" size="sm" variant="secondary" onClick={() => addToolStep(tool.name)}>
                      Add Step
                    </Button>
                    <span>{tool.parameters.length} params</span>
                  </div>
                </div>
              ))}
              {filteredTools.length === 0 ? <div className="tool-empty-state">No tools matched that search.</div> : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default EditorSidebar;
