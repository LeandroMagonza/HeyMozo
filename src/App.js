// src/App.js

import React, { useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminScreen from './components/AdminScreen';
import UserScreen from './components/UserScreen';
import BranchConfig from './components/BranchConfig';
import CompanyConfig from './components/CompanyConfig';
import CompanyList from './components/CompanyList';
import CompanyCreate from './components/CompanyCreate';
import TableUrls from './components/TableUrls';
import LoginPage from './components/LoginPage';
import LoginForm from './components/LoginForm';
import ProtectedRoute from './components/ProtectedRoute';
import axios from 'axios';
import './App.css';
import FeatureCarousel from "./components/FeatureCarousel";
import BenefitsSection from "./components/BenefitsSection";
import HowItWorks from "./components/HowItWorks";

function LandingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const contactFormRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/mailing-list", formData);
      alert(
        "¡Gracias por tu interés! Nos pondremos en contacto contigo pronto."
      );
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      alert(
        "Hubo un error al enviar el formulario. Por favor, intenta nuevamente."
      );
    }
  };

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-content">
          <div className="text-content">
            <h2 className="tagline">
              La forma más inteligente de atender tu restaurante
            </h2>
          </div>
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/heymozo-logo-lAd92AUlDVMY1PI8cSvsGEVNsGN0P2.png"
            alt="HeyMozo Logo"
            className="hero-logo"
          />
        </div>
      </section>

      <section className="features-section">
        <h2>Optimiza tu Servicio</h2>
        <FeatureCarousel />
      </section>

      <BenefitsSection />

      <HowItWorks />

      <section className="contact-section" ref={contactFormRef}>
        <div className="contact-container">
          <div className="contact-info">
            <h2>Contactanos</h2>
            <p>
              ¿Tenés alguna pregunta o comentario? No dudes en contactarnos.
              Estamos aquí para ayudarte.
            </p>
          </div>
          <form id="demo-form" onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Nombre</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Mensaje</label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Cuéntanos sobre tu restaurante..."
                required
              />
            </div>
            <button type="submit" className="submit-button">
              Solicitar Demo
            </button>
          </form>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2025 HeyMozo - Transformando la experiencia gastronómica</p>
      </footer>
    </div>
  );
}
/*Falta http://localhost:3000/admin/1/1/config */
function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/user/:companyId/:branchId/:tableId" element={<UserScreen />} />
        
        {/* Authentication routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginForm />} />
        
        {/* Protected admin routes */}
        <Route 
          path="/admin/config" 
          element={
            <ProtectedRoute>
              <CompanyList />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/company/create" 
          element={
            <ProtectedRoute>
              <CompanyCreate />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/:companyId/config" 
          element={
            <ProtectedRoute>
              <CompanyConfig />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/:companyId/:branchId/config" 
          element={
            <ProtectedRoute>
              <BranchConfig />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/:companyId/:branchId/urls" 
          element={
            <ProtectedRoute>
              <TableUrls />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/:companyId/:branchId" 
          element={
            <ProtectedRoute>
              <AdminScreen />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;

//
//      <Router>
//        <Header />
//        <Routes>
//          <Route path="/admin/:companyId/:branchId" element={<AdminScreen />} />
//          <Route
//            path="/admin/:companyId/:branchId/config"
//            element={<BranchConfig />}
//          />
//          <Route
//            path="/admin/:companyId/:branchId/urls"
//            element={<TableUrls />}
//          />
//          <Route path="/admin/:companyId/config" element={<CompanyConfig />} />
//          <Route path="/admin/config" element={<CompanyList />} />
//          <Route
//            path="/user/:companyId/:branchId/:tableId"
//            element={<UserScreen />}
//          />
//          <Route path="/" element={<LandingPage />} />
//        </Routes>
//      </Router>
//    </div>
