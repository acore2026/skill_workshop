import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Button from '../../components/Button';
import { useStore } from '../../store/useStore';
import type { UtilityTab } from '../../store/useStore';
import './UtilityPanel.css';

interface UtilityPanelProps {
  activeTab?: UtilityTab;
  showTabs?: boolean;
}

const splitMarkdownFrontMatter = (markdown: string) => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontMatter: '', body: markdown };
  }
  return {
    frontMatter: `---\n${match[1]}\n---`,
    body: markdown.slice(match[0].length).trimStart(),
  };
};

const UtilityPanel: React.FC<UtilityPanelProps> = ({ activeTab, showTabs = true }) => {
  const { document, rawSkillMarkdown, markdownError, utilityTab, setUtilityTab, validateDocument } = useStore();
  const [markdownView, setMarkdownView] = useState<'preview' | 'source'>('preview');
  const resolvedTab = activeTab ?? utilityTab;
  const { frontMatter, body } = splitMarkdownFrontMatter(rawSkillMarkdown);

  if (!document && !rawSkillMarkdown.trim()) {
    return null;
  }

  return (
    <div className="utility-panel">
      {showTabs ? (
        <div className="utility-toolbar">
          <div className="utility-tabs">
            {(['log', 'validation', 'markdown'] as const).map((tab) => (
              <button key={tab} type="button" className={resolvedTab === tab ? 'is-active' : ''} onClick={() => setUtilityTab(tab)}>
                {tab === 'log' ? 'Log' : tab === 'validation' ? 'Validation' : 'Markdown'}
              </button>
            ))}
          </div>
          <div className="utility-actions">
            <Button size="sm" variant="secondary" onClick={validateDocument}>
              Validate
            </Button>
          </div>
        </div>
      ) : null}

      <div className="utility-body">
        {resolvedTab === 'log' && (
          <div className="utility-list">
            {!document || document.execution.timeline.length === 0 ? (
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

        {resolvedTab === 'validation' && (
          <div className="utility-columns">
            <div>
              <div className="utility-column-label">Errors</div>
              {!document || document.validation.errors.length === 0 ? (
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
              {!document || document.validation.warnings.length === 0 ? (
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

        {resolvedTab === 'markdown' && (
          <div className="utility-yaml">
            {markdownError && <div className="utility-entry level-error">Markdown error: {markdownError}</div>}
            <div className="utility-subtabs">
              <button type="button" className={markdownView === 'preview' ? 'is-active' : ''} onClick={() => setMarkdownView('preview')}>
                Preview
              </button>
              <button type="button" className={markdownView === 'source' ? 'is-active' : ''} onClick={() => setMarkdownView('source')}>
                Source
              </button>
            </div>
            {rawSkillMarkdown.trim() ? (
              markdownView === 'source' ? (
                <textarea readOnly value={rawSkillMarkdown} className="utility-yaml-viewer" />
              ) : (
                <div className="utility-markdown-preview">
                  {frontMatter ? <pre className="utility-markdown-frontmatter">{frontMatter}</pre> : null}
                  {body ? <ReactMarkdown>{body}</ReactMarkdown> : null}
                </div>
              )
            ) : (
              <div className="utility-empty">No markdown skill document available yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilityPanel;
