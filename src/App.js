// src/App.js

import React, { useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminScreen from "./components/AdminScreen";
import UserScreen from "./components/UserScreen";
import BranchConfig from "./components/BranchConfig";
import CompanyConfig from "./components/CompanyConfig";
import CompanyList from "./components/CompanyList";
import TableUrls from "./components/TableUrls";
import axios from "axios";
import "./App.css";
import Header from "./components/Header";
import FeatureCarousel from "./components/FeatureCarousel";
import BenefitsSection from "./components/BenefitsSection";

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
            <h1>HeyMozo</h1>
            <p className="tagline">
              La forma más inteligente de atender tu restaurante
            </p>
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

      <section className="how-it-works">
        <h2>Simple y Efectivo</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Genera QRs</h3>
            <p>Crea códigos únicos para cada mesa de tu local</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Configura</h3>
            <p>Personaliza tu menú y opciones en el dashboard</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Conecta</h3>
            <p>Los clientes escanean y acceden a todas las funciones</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Gestiona</h3>
            <p>Administra pedidos y mesas en tiempo real</p>
          </div>
        </div>
      </section>

      <section className="contact-section" ref={contactFormRef}>
        <div className="contact-container">
          <div className="contact-info">
            <h2>Mejora la Experiencia de tu Restaurante</h2>
            <p className="contact-intro">
              Únete a los restaurantes que ya optimizaron su servicio con
              HeyMozo
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
        <p>© 2024 HeyMozo - Transformando la experiencia gastronómica</p>
      </footer>
    </div>
  );
}
function App() {
  return (
    <div className="App">
      <Header />
      <Router>
        <Routes>
          <Route path="/admin/:companyId/:branchId" element={<AdminScreen />} />
          <Route
            path="/admin/:companyId/:branchId/config"
            element={<BranchConfig />}
          />
          <Route
            path="/admin/:companyId/:branchId/urls"
            element={<TableUrls />}
          />
          <Route path="/admin/:companyId/config" element={<CompanyConfig />} />
          <Route path="/admin/config" element={<CompanyList />} />
          <Route
            path="/user/:companyId/:branchId/:tableId"
            element={<UserScreen />}
          />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
