import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Button from '../../components/Button';
import { useStore } from '../../store/useStore';
import './UtilityPanel.css';

const tabs = [
  { id: 'log', label: 'Log' },
  { id: 'validation', label: 'Validation' },
  { id: 'search', label: 'Search' },
  { id: 'trace', label: 'Trace' },
] as const;

const UtilityPanel: React.FC = () => {
  const { document, utilityTab, setUtilityTab, runMockExecution, resetExecution, validateDocument, appState } = useStore();
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!document || !query.trim()) {
      return [];
    }

    const q = query.toLowerCase();
    return document.nodes.filter(
      (node) =>
        node.title.toLowerCase().includes(q) ||
        node.summary.toLowerCase().includes(q) ||
        node.cardType.toLowerCase().includes(q) ||
        [...node.inputs, ...node.outputs].some((port) => port.name.toLowerCase().includes(q)) ||
        node.nextActions.some((port) => port.label.toLowerCase().includes(q)),
    );
  }, [document, query]);

  if (!document) {
    return null;
  }

  return (
    <div className="utility-panel">
      <div className="utility-toolbar">
        <div className="utility-tabs">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={utilityTab === tab.id ? 'is-active' : ''} onClick={() => setUtilityTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="utility-actions">
          <Button size="sm" variant="secondary" onClick={validateDocument}>
            Validate
          </Button>
          <Button size="sm" variant="primary" onClick={runMockExecution} disabled={appState === 'mock_running'}>
            Run
          </Button>
          <Button size="sm" variant="ghost" onClick={resetExecution}>
            Reset
          </Button>
        </div>
      </div>

      <div className="utility-body">
        {utilityTab === 'log' && (
          <div className="utility-list">
            {document.execution.timeline.length === 0 ? (
              <div className="utility-empty">No log entries yet.</div>
            ) : (
              document.execution.timeline.map((item) => (
                <div key={item.id} className={`utility-entry level-${item.level}`}>
                  <div className="utility-entry-head">
                    <span>{item.level}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>{item.message}</div>
                </div>
              ))
            )}
          </div>
        )}

        {utilityTab === 'validation' && (
          <div className="utility-columns">
            <div>
              <div className="utility-column-label">Errors</div>
              {document.validation.errors.length === 0 ? (
                <div className="utility-empty small">No blocking errors.</div>
              ) : (
                document.validation.errors.map((error) => (
                  <div key={error} className="utility-entry level-error">
                    {error}
                  </div>
                ))
              )}
            </div>
            <div>
              <div className="utility-column-label">Warnings</div>
              {document.validation.warnings.length === 0 ? (
                <div className="utility-empty small">No warnings.</div>
              ) : (
                document.validation.warnings.map((warning) => (
                  <div key={warning} className="utility-entry level-warning">
                    {warning}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {utilityTab === 'search' && (
          <div className="utility-search">
            <label className="utility-search-box">
              <Search size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards, lanes, or case terms" />
            </label>
            <div className="utility-list">
              {!query.trim() ? (
                <div className="utility-empty">Enter a query to search the graph.</div>
              ) : searchResults.length === 0 ? (
                <div className="utility-empty">No action cards matched that query.</div>
              ) : (
                searchResults.map((node) => (
                  <div key={node.id} className="utility-entry">
                    <div className="utility-entry-head">
                      <span>{node.title}</span>
                      <span>{node.cardType}</span>
                    </div>
                    <div>{[...node.inputs.map((port) => port.name), ...node.outputs.map((port) => port.name), ...node.nextActions.map((port) => port.label)].join(', ')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {utilityTab === 'trace' && (
          <div className="utility-list">
            {document.nodes.map((node) => (
              <div key={node.id} className="trace-row">
                <div>
                  <div className="trace-title">{node.title}</div>
                  <div className="trace-meta">{node.cardType}</div>
                </div>
                <span className={`trace-status ${document.execution.nodeStatuses[node.id] ?? 'idle'}`}>
                  {document.execution.nodeStatuses[node.id] ?? 'idle'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilityPanel;
