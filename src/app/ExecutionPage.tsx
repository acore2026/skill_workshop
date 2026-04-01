import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import NavHeader from '../components/NavHeader';
import AgentChatbox from '../features/prompt/AgentChatbox';
import ExecutionPanel from '../features/execution/ExecutionPanel';
import { useStore } from '../store/useStore';
import './Workspace.css';

const ExecutionPage: React.FC = () => {
  const { document } = useStore();

  const readBooleanPreference = (key: string, fallback = false) => {
    if (typeof window === 'undefined') {
      return fallback;
    }
    const savedValue = window.localStorage.getItem(key);
    return savedValue === null ? fallback : savedValue === 'true';
  };

  const [chatCollapsed, setChatCollapsed] = useState(() => readBooleanPreference('skill-workshop-chat-collapsed'));

  const toggleChat = () => {
    setChatCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('skill-workshop-chat-collapsed', String(next));
      }
      return next;
    });
  };

  const header = <NavHeader />;

  const sidePanel = (
    <div className="workspace-side-panel workspace-panel-shell">
      <div className="workspace-panel-header">
        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Step Inspector</div>
      </div>
      <div className="workspace-side-panel-body" style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
        Select a step in the monitor to see details.
      </div>
    </div>
  );

  return (
    <AppShell
      header={header}
      chatPanel={<AgentChatbox collapsed={chatCollapsed} onToggleCollapse={toggleChat} />}
      mainContent={
        <div className="workspace-center" style={{ gridColumn: '1 / span 3', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }}>
          <div className="workspace-sidebar" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>Run History</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No recent runs.</div>
          </div>
          <div className="workspace-surface" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Execution Monitor</div>
              <div style={{ fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.6rem', borderRadius: '99px', border: '1px solid #a7f3d0' }}>Mock Execution Mode</div>
            </div>
            <div style={{ flex: 1, padding: '1rem', position: 'relative' }}>
              {document ? (
                <ExecutionPanel />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                  No skill loaded. Go to Workshop to generate a skill.
                </div>
              )}
            </div>
          </div>
        </div>
      }
      sidePanel={sidePanel}
    />
  );
};

export default ExecutionPage;
