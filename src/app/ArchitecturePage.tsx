import React from 'react';
import AppShell from '../components/AppShell';
import NavHeader from '../components/NavHeader';
import ArchitectureGraph from '../features/architecture/ArchitectureGraph';

const ArchitecturePage: React.FC = () => {
  const header = (
    <>
      <NavHeader />
      <div className="toolbar-actions" style={{ marginLeft: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
        6G CORE NETWORK TOPOLOGY
      </div>
    </>
  );

  return (
    <AppShell
      header={header}
      mainContent={
        <div className="workspace-surface" style={{ background: '#f8fafc' }}>
          <ArchitectureGraph />
        </div>
      }
    />
  );
};

export default ArchitecturePage;
