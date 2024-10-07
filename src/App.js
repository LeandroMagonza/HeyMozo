// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminScreen from './components/AdminScreen';
import UserScreen from './components/UserScreen';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/:companyId/:branchId" element={<AdminScreen />} />
        <Route path="/user/:companyId/:branchId/:tableId" element={<UserScreen />} />
        <Route path="/" element={<h1>Página de Inicio</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
