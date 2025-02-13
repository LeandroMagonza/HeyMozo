// src/App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminScreen from './components/AdminScreen';
import UserScreen from './components/UserScreen';
import BranchConfig from './components/BranchConfig';
import CompanyConfig from './components/CompanyConfig';
import CompanyList from './components/CompanyList';
import TableUrls from './components/TableUrls';
import axios from 'axios';
import './App.css';

function LandingPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const heroStyle = {
    background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${process.env.PUBLIC_URL + '/images/restaurant-bg.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/mailing-list', formData);
      alert('¡Gracias por tu interés! Nos pondremos en contacto contigo pronto.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      alert('Hubo un error al enviar el formulario. Por favor, intenta nuevamente.');
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <img src="/images/heymozo-logo.png" alt="HeyMozo Logo" className="landing-logo" />
        <h1>HeyMozo</h1>
        <p className="tagline">Revoluciona la experiencia en tu restaurante</p>
      </header>

      <section className="hero-section" style={heroStyle}>
        <div className="hero-content">
          <h2>Mejora el servicio de tu local con tecnología simple y efectiva</h2>
          <p>Sistema de gestión inteligente que optimiza la comunicación entre tus clientes y el personal</p>
        </div>
      </section>

      <section className="features-section">
        <h2>Beneficios para tu Restaurante</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Eficiencia Operativa</h3>
            <p>Reduce los viajes innecesarios de tus mozos y optimiza el tiempo de atención con un sistema de notificaciones inteligente</p>
          </div>
          <div className="feature-card">
            <h3>Mejor Organización</h3>
            <p>Visualiza en tiempo real las necesidades de cada mesa y coordina mejor el trabajo de tu personal</p>
          </div>
          <div className="feature-card">
            <h3>Fácil Implementación</h3>
            <p>Sistema intuitivo que requiere mínima configuración. Solo genera los códigos QR y colócalos en tus mesas</p>
          </div>
          <div className="feature-card">
            <h3>Gestión de Espacios</h3>
            <p>Ideal para locales con áreas separadas, subsuelos, patios exteriores o espacios detrás de paredes</p>
          </div>
        </div>
      </section>

      <section className="features-section customer-benefits">
        <h2>Experiencia del Cliente</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Atención sin Interrupciones</h3>
            <p>Los clientes pueden disfrutar de su experiencia sin necesidad de estar buscando contacto visual con el mozo</p>
          </div>
          <div className="feature-card">
            <h3>Servicio Inmediato</h3>
            <p>Solicitudes directas para llamar al mozo, pedir la cuenta o contactar al encargado con un simple toque</p>
          </div>
          <div className="feature-card">
            <h3>Menú Digital</h3>
            <p>Acceso inmediato al menú actualizado escaneando el código QR de la mesa</p>
          </div>
          <div className="feature-card">
            <h3>Pago Eficiente</h3>
            <p>Posibilidad de especificar el método de pago al solicitar la cuenta, agilizando el proceso</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>¿Cómo Funciona?</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Implementación Simple</h3>
            <p>Generamos códigos QR únicos para cada mesa de tu local</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Escaneo del Cliente</h3>
            <p>Los clientes escanean el código y acceden a todas las funcionalidades</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Gestión en Tiempo Real</h3>
            <p>Tu personal recibe las solicitudes y puede atenderlas eficientemente</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Mejor Servicio</h3>
            <p>Optimiza tiempos de atención y mejora la experiencia del cliente</p>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <h2>¿Te interesa implementar HeyMozo en tu negocio?</h2>
        <p className="contact-intro">Mejora la eficiencia de tu servicio y la satisfacción de tus clientes con nuestra solución</p>
        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Mensaje</label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Cuéntanos sobre tu negocio y cómo podemos ayudarte..."
              required
            />
          </div>
          <button type="submit" className="submit-button">Enviar</button>
        </form>
      </section>

      <footer className="landing-footer">
        <p>© 2024 HeyMozo - Transformando la experiencia gastronómica</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/:companyId/:branchId" element={<AdminScreen />} />
        <Route path="/admin/:companyId/:branchId/config" element={<BranchConfig />} />
        <Route path="/admin/:companyId/:branchId/urls" element={<TableUrls />} />
        <Route path="/admin/:companyId/config" element={<CompanyConfig />} />
        <Route path="/admin/config" element={<CompanyList />} />
        <Route path="/user/:companyId/:branchId/:tableId" element={<UserScreen />} />
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
