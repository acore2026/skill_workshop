import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Workspace from './app/Workspace';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
      </Routes>
    </Router>
  );
}

export default App;
