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
        {/* Ruta para la pantalla de administrador */}
        <Route path="/admin" element={<AdminScreen />} />

        {/* Ruta para la pantalla de usuario, pasando el ID de la mesa como parámetro */}
        <Route path="/user/:tableId" element={<UserScreen />} />

        {/* Ruta por defecto o página de inicio (opcional) */}
        <Route path="/" element={<h1>Página de Inicio</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
