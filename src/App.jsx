import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import BOMViewer from './pages/BOMViewer';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/viewer" element={<BOMViewer />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
