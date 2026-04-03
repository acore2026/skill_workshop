import React from 'react';
import { NavLink } from 'react-router-dom';
import { Waypoints } from 'lucide-react';
import StatusPill from './StatusPill';
import { useStore } from '../store/useStore';
import '../app/Workspace.css';
import './NavHeader.css';

const NavHeader: React.FC = () => {
  const { appState } = useStore();

  return (
    <header className="workspace-toolbar">
      <div className="toolbar-brand">
        <div className="brand-mark">
          <Waypoints size={18} strokeWidth={2.1} />
        </div>
        <div>
          <div className="brand-title">6G Agentic Core Big Screen</div>
        </div>
      </div>

      <nav className="toolbar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`} end>
          Architecture
        </NavLink>
        <NavLink to="/workshop" className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
          Workshop
        </NavLink>
        <NavLink to="/execution" className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
          Execution
        </NavLink>
      </nav>

      <div className="toolbar-status">
        <StatusPill status={appState} />
      </div>
    </header>
  );
};

export default NavHeader;
