import React, { useCallback, useEffect, useState } from 'react';
import {
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  LayoutGrid,
  Maximize2,
  Search,
  Settings2,
  Undo2,
  Redo2,
  Save,
  SlidersHorizontal,
  SquarePen,
  Wrench,
} from 'lucide-react';
import Button from '../components/Button';
import GraphEditor from '../features/graph/GraphEditor';
import InspectorPanel from '../features/inspector/InspectorPanel';
import AgentChatbox from '../features/prompt/AgentChatbox';
import UtilityPanel from '../features/utility/UtilityPanel';
import AppShell from '../components/AppShell';
import NavHeader from '../components/NavHeader';
import { useStore } from '../store/useStore';
import './Workspace.css';

type SidePanelTab = 'inspector' | 'log' | 'validation' | 'markdown';

const Workspace: React.FC = () => {
  const {
    autoLayout,
    requestFitView,
    validateDocument,
    selectedNodeId,
    selectedEdgeId,
    setUtilityTab,
  } = useStore();

  const readBooleanPreference = (key: string, fallback = false) => {
    if (typeof window === 'undefined') {
      return fallback;
    }
    const savedValue = window.localStorage.getItem(key);
    return savedValue === null ? fallback : savedValue === 'true';
  };

  const [chatCollapsed, setChatCollapsed] = useState(() => readBooleanPreference('skill-workshop-chat-collapsed'));
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(() => readBooleanPreference('skill-workshop-sidepanel-collapsed'));
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>(() => {
    if (typeof window === 'undefined') {
      return 'inspector';
    }
    const savedValue = window.localStorage.getItem('skill-workshop-sidepanel-tab');
    return savedValue === 'log' || savedValue === 'validation' || savedValue === 'markdown' || savedValue === 'inspector'
      ? savedValue
      : 'inspector';
  });

  const toggleChat = () => {
    setChatCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('skill-workshop-chat-collapsed', String(next));
      }
      return next;
    });
  };

  const toggleSidePanel = () => {
    setSidePanelCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('skill-workshop-sidepanel-collapsed', String(next));
      }
      return next;
    });
  };

  const handleSidePanelTabChange = useCallback((tab: SidePanelTab) => {
    setSidePanelTab(tab);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('skill-workshop-sidepanel-tab', tab);
    }
    if (tab === 'log' || tab === 'validation' || tab === 'markdown') {
      setUtilityTab(tab);
    }
  }, [setUtilityTab]);

  useEffect(() => {
    if (sidePanelCollapsed) {
      return;
    }
    if (selectedNodeId || selectedEdgeId) {
      const timerId = window.setTimeout(() => {
        handleSidePanelTabChange('inspector');
      }, 0);
      return () => window.clearTimeout(timerId);
    }
  }, [selectedNodeId, selectedEdgeId, sidePanelCollapsed, handleSidePanelTabChange]);

  const header = (
    <>
      <NavHeader />
      <div className="toolbar-actions">
        <Button size="sm" variant="secondary">
          <Save size={14} />
          Save
        </Button>
        <Button size="sm" variant="ghost" disabled>
          <Undo2 size={14} />
          Undo
        </Button>
        <Button size="sm" variant="ghost" disabled>
          <Redo2 size={14} />
          Redo
        </Button>
        <Button size="sm" variant="secondary">
          <Search size={14} />
          Search
        </Button>
        <Button size="sm" variant="secondary" onClick={autoLayout}>
          <LayoutGrid size={14} />
          Auto Layout
        </Button>
        <Button size="sm" variant="secondary" onClick={requestFitView}>
          <Maximize2 size={14} />
          Zoom To Fit
        </Button>
        <Button size="sm" variant="secondary" onClick={validateDocument}>
          <CheckCircle2 size={14} />
          Validate
        </Button>
        <Button size="sm" variant="ghost">
          <Settings2 size={14} />
          Settings
        </Button>
      </div>
    </>
  );

  const sidePanel = (
    <div className={`workspace-side-panel workspace-panel-shell ${sidePanelCollapsed ? 'is-collapsed' : ''}`}>
      {sidePanelCollapsed ? (
        <button
          type="button"
          className="workspace-side-collapsed-rail"
          onClick={toggleSidePanel}
          aria-label="Expand skill editor"
          title="Expand skill editor"
        >
          <Wrench size={18} />
          <span>Skill Editor</span>
          <PanelRightOpen size={16} />
        </button>
      ) : (
        <>
          <div className="workspace-panel-header workspace-panel-switches">
            <div className="workspace-side-panel-tabs">
              <button type="button" className={sidePanelTab === 'inspector' ? 'is-active' : ''} onClick={() => handleSidePanelTabChange('inspector')}>
                <SquarePen size={14} />
                Inspector
              </button>
              <button type="button" className={sidePanelTab === 'log' ? 'is-active' : ''} onClick={() => handleSidePanelTabChange('log')}>
                <SlidersHorizontal size={14} />
                Log
              </button>
              <button type="button" className={sidePanelTab === 'validation' ? 'is-active' : ''} onClick={() => handleSidePanelTabChange('validation')}>
                <CheckCircle2 size={14} />
                Validation
              </button>
              <button type="button" className={sidePanelTab === 'markdown' ? 'is-active' : ''} onClick={() => handleSidePanelTabChange('markdown')}>
                <Wrench size={14} />
                Markdown
              </button>
            </div>
            <button type="button" className="workspace-panel-toggle" onClick={toggleSidePanel} aria-label="Collapse side panel">
              <PanelRightClose size={15} />
            </button>
          </div>
          <div className="workspace-side-panel-body">
            {sidePanelTab === 'inspector' && <InspectorPanel />}
            {sidePanelTab === 'log' && <UtilityPanel activeTab="log" showTabs={false} />}
            {sidePanelTab === 'validation' && <UtilityPanel activeTab="validation" showTabs={false} />}
            {sidePanelTab === 'markdown' && <UtilityPanel activeTab="markdown" showTabs={false} />}
          </div>
        </>
      )}
    </div>
  );

  return (
    <AppShell
      header={header}
      chatPanel={<AgentChatbox collapsed={chatCollapsed} onToggleCollapse={toggleChat} />}
      mainContent={
        <div className="workspace-surface">
          <GraphEditor />
        </div>
      }
      sidePanel={sidePanel}
    />
  );
};

export default Workspace;
