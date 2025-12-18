import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import BOMViewer from './pages/BOMViewer';

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/viewer';

  return (
    <div className="App">
      {!hideNavbar && <Navbar />}
      <div className={hideNavbar ? '' : 'pt-16'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/viewer" element={<BOMViewer />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
