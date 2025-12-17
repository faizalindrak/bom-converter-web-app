import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BOMViewer from './pages/BOMViewer';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/viewer" element={<BOMViewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
