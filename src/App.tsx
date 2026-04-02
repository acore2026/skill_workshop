import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Workspace from './app/Workspace';
import ExecutionPage from './app/ExecutionPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/execution" element={<ExecutionPage />} />
      </Routes>
    </Router>
  );
}

export default App;
