import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Workspace from './app/Workspace';
import ExecutionPage from './app/ExecutionPage';
import ArchitecturePage from './app/ArchitecturePage';
import SkillLibraryModal from './features/navigation/SkillLibraryModal';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const loadToolCatalog = useStore((state) => state.loadToolCatalog);

  useEffect(() => {
    void loadToolCatalog();
  }, [loadToolCatalog]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/execution" element={<ExecutionPage />} />
      </Routes>
      <SkillLibraryModal />
    </Router>
  );
}

export default App;
