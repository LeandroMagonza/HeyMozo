// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminScreen from "./components/AdminScreen";
import UserScreen from "./components/UserScreen";
import CompanyList from "./components/CompanyList";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta para la lista de compañías */}
        <Route path="/admin" element={<CompanyList />} />

        {/* Ruta para la pantalla de administrador de una compañía específica */}
        <Route path="/admin/:companyId" element={<AdminScreen />} />

        {/* Ruta para la pantalla de usuario, pasando el ID de la mesa como parámetro */}
        <Route path="/user/:companyId/:tableId" element={<UserScreen />} />

        {/* Ruta por defecto o página de inicio (opcional) */}
        <Route path="/" element={<h1>Página de Inicio</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
