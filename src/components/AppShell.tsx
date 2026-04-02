import React, { useState } from 'react';
import './AppShell.css';

interface AppShellProps {
  header: React.ReactNode;
  chatPanel?: React.ReactNode;
  mainContent: React.ReactNode;
  sidePanel?: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ header, chatPanel, mainContent, sidePanel }) => {
  const readNumberPreference = (key: string, fallback: number, min: number, max: number) => {
    if (typeof window === 'undefined') {
      return fallback;
    }
    const savedValue = window.localStorage.getItem(key);
    const parsed = savedValue ? Number(savedValue) : NaN;
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
  };

  const readBooleanPreference = (key: string, fallback = false) => {
    if (typeof window === 'undefined') {
      return fallback;
    }
    const savedValue = window.localStorage.getItem(key);
    return savedValue === null ? fallback : savedValue === 'true';
  };

  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    return readNumberPreference('skill-workshop-chat-width', 420, 340, 620);
  });
  const [sidePanelWidth, setSidePanelWidth] = useState(() => {
    return readNumberPreference('skill-workshop-sidepanel-width', 360, 280, 520);
  });
  const [chatCollapsed] = useState(() => readBooleanPreference('skill-workshop-chat-collapsed'));
  const [sidePanelCollapsed] = useState(() => readBooleanPreference('skill-workshop-sidepanel-collapsed'));

  const handleChatResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (chatCollapsed) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = chatPanelWidth;

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(340, Math.min(620, startWidth + (moveEvent.clientX - startX)));
      setChatPanelWidth(nextWidth);
      window.localStorage.setItem('skill-workshop-chat-width', String(nextWidth));
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleSideResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (sidePanelCollapsed) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidePanelWidth;

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(280, Math.min(520, startWidth - (moveEvent.clientX - startX)));
      setSidePanelWidth(nextWidth);
      window.localStorage.setItem('skill-workshop-sidepanel-width', String(nextWidth));
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  return (
    <div
      className={`workspace-shell ${chatCollapsed ? 'chat-collapsed' : ''} ${!chatPanel ? 'no-chat' : ''}`}
      style={{
        ['--chat-panel-width' as string]: chatCollapsed ? '72px' : `${chatPanelWidth}px`,
        ['--side-panel-width' as string]: sidePanelCollapsed ? '56px' : `${sidePanelWidth}px`,
      }}
    >
      <header className="workspace-toolbar-container">
        {header}
      </header>

      <main className="workspace-main" style={!chatPanel ? { gridTemplateColumns: `minmax(0, 1fr) ${sidePanel ? '6px var(--side-panel-width)' : ''}` } : {}}>
        {chatPanel && (
          <>
            <aside className={`workspace-chat-panel ${chatCollapsed ? 'is-collapsed' : ''}`}>
              {chatPanel}
            </aside>
            <div
              className={`workspace-chat-resizer ${chatCollapsed ? 'is-disabled' : ''}`}
              onMouseDown={handleChatResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
            />
          </>
        )}

        <section className="workspace-center" style={!chatPanel ? { gridColumn: '1' } : {}}>
          {mainContent}
        </section>

        {sidePanel && (
          <>
            <div
              className={`workspace-side-resizer ${sidePanelCollapsed ? 'is-disabled' : ''}`}
              onMouseDown={handleSideResizeStart}
              style={!chatPanel ? { gridColumn: '2' } : {}}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize side panel"
            />
            <aside className="workspace-side-panel-rail" style={!chatPanel ? { gridColumn: '3' } : {}}>
              {sidePanel}
            </aside>
          </>
        )}
      </main>
    </div>
  );
};

export default AppShell;
