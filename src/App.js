// src/App.js

import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import UserScreen from "./components/UserScreen";
import MenuClient from "./components/MenuClient";
import ConfirmadoPage from "./components/ConfirmadoPage";
import WaitingPaymentPage from "./components/WaitingPaymentPage";
import PagoConfirmadoPage from "./components/PagoConfirmadoPage";
import BranchConfig from "./components/BranchConfig";
import BranchCreate from "./components/BranchCreate";
import CompanyConfig from "./components/CompanyConfig";
import CompanyList from "./components/CompanyList";
import CompanyCreate from "./components/CompanyCreate";
import TableUrls from "./components/TableUrls";
import MenuAdmin from "./components/MenuAdmin";
import PaymentConfig from "./components/PaymentConfig";
import UserProfile from "./components/UserProfile";
import LoginPage from "./components/LoginPage";
import LoginForm from "./components/LoginForm";
import ProtectedRoute from "./components/ProtectedRoute";
import FAQ from "./components/FAQ";
import OpShell from "./components/OpShell";
import CajaShell from "./components/CajaShell";
import AdminShell from "./components/AdminShell";
import axios from "axios";
import "./App.css";
import FeatureCarousel from "./components/FeatureCarousel";
import BenefitsSection from "./components/BenefitsSection";
import HowItWorks from "./components/HowItWorks";

// Redirect helpers — extract URL params and navigate to new-style routes.
function UserRedirect() {
  const { companyId, branchId, tableId } = useParams();
  return <Navigate to={`/m/${companyId}/${branchId}/${tableId}`} replace />;
}
function AdminBranchRedirect() {
  const { branchId } = useParams();
  return <Navigate to={`/piso/${branchId}`} replace />;
}
function AdminCompanyConfigRedirect() {
  const { companyId } = useParams();
  return <Navigate to={`/config/${companyId}`} replace />;
}
function AdminBranchConfigRedirect() {
  const { companyId, branchId } = useParams();
  return <Navigate to={`/config/${companyId}/${branchId}`} replace />;
}
function AdminBranchUrlsRedirect() {
  const { companyId, branchId } = useParams();
  return <Navigate to={`/config/${companyId}/${branchId}/urls`} replace />;
}

function LandingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const contactFormRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Solo controlar el header después de 100px de scroll
      if (currentScrollY > 100) {
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
          // Scrolling down - hide header
          setHeaderVisible(false);
        } else {
          // Scrolling up - show header
          setHeaderVisible(true);
        }
      } else {
        // Siempre mostrar header en la parte superior
        setHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  // Effect para manejar el scroll automático cuando viene con hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#contact-section") {
        setTimeout(() => {
          const contactSection = document.getElementById("contact-section");
          if (contactSection) {
            contactSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 300);
      }
    };

    // Ejecutar al cargar la página
    handleHashChange();

    // Escuchar cambios en el hash
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/mailing-list", formData);
      alert(
        "¡Gracias por tu interés! Nos pondremos en contacto contigo pronto."
      );
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      // Handle specific error messages from the backend
      const errorMessage = error.response?.data?.error ||
        "Hubo un error al enviar el formulario. Por favor, intenta nuevamente.";
      alert(errorMessage);
    }
  };

  return (
    <div className="landing-page">
      <header
        className={`landing-header ${headerVisible ? "visible" : "hidden"}`}
      >
        <div className="header-content">
          <div className="logo-section">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/heymozo-logo-lAd92AUlDVMY1PI8cSvsGEVNsGN0P2.png"
              alt="HeyMozo Logo"
              className="header-logo"
            />
            <span className="brand-name">HeyMozo</span>
          </div>
          <div className="header-actions">
            <a href="/admin/login" className="login-button">
              Iniciar Sesión
            </a>
          </div>
        </div>
      </header>

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

      <section
        id="contact-section"
        className="contact-section"
        ref={contactFormRef}
      >
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
              Enviar{" "}
            </button>
          </form>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="/faq" className="footer-link">
              Preguntas Frecuentes
            </a>
          </div>
          <p>© 2025 HeyMozo - Transformando la experiencia gastronómica</p>
        </div>
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
        <Route path="/faq" element={<FAQ />} />
        <Route path="/m/:companyId/:branchId/:tableId" element={<UserScreen />} />
        {/* Redirect 301 desde URL vieja (Sprint 1.4) */}
        <Route path="/user/:companyId/:branchId/:tableId" element={<UserRedirect />} />

        {/* Customer menu route (Sprint 2.5) — sibling of /m/:c/:b/:t from Sprint 1.4 */}
        <Route
          path="/m/:companyId/:branchId/:tableId/menu"
          element={<MenuClient />}
        />

        {/* Customer confirmed (Sprint 3.3) — el carrito vive como sheet
            dentro de MenuClient desde Sprint 5.1, ya no hay ruta /pedido. */}
        <Route
          path="/m/:companyId/:branchId/:tableId/confirmado/:orderId"
          element={<ConfirmadoPage />}
        />

        {/* Customer payment flow (Sprint 5.4) — espera y confirmación post-cobro */}
        <Route
          path="/m/:companyId/:branchId/:tableId/waiting-payment/:paymentId"
          element={<WaitingPaymentPage />}
        />
        <Route
          path="/m/:companyId/:branchId/:tableId/pago-confirmado/:paymentId"
          element={<PagoConfirmadoPage />}
        />

        {/* Authentication routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginForm />} />

        {/* ===== New shell routes (Sprint 1.3) ===== */}

        {/* OpShell — panel operativo del piso (mozo) */}
        <Route
          path="/piso/:branchId"
          element={
            <ProtectedRoute>
              <OpShell />
            </ProtectedRoute>
          }
        />

        {/* CajaShell — panel de caja (cajero/owner) */}
        <Route
          path="/caja/:branchId"
          element={
            <ProtectedRoute>
              <CajaShell />
            </ProtectedRoute>
          }
        />

        {/* AdminShell — configuración (owner/admin) */}
        <Route
          path="/config"
          element={
            <ProtectedRoute>
              <AdminShell>
                <CompanyList />
              </AdminShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/config/company/create"
          element={
            <ProtectedRoute>
              <AdminShell>
                <CompanyCreate />
              </AdminShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/config/:companyId"
          element={
            <ProtectedRoute>
              <AdminShell>
                <CompanyConfig />
              </AdminShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/config/:companyId/:branchId"
          element={
            <ProtectedRoute>
              <AdminShell>
                <BranchConfig />
              </AdminShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/config/:companyId/:branchId/urls"
          element={
            <ProtectedRoute>
              <AdminShell>
                <TableUrls />
              </AdminShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/config/:companyId/:branchId/payments"
          element={
            <ProtectedRoute>
              <AdminShell>
                <PaymentConfig />
              </AdminShell>
            </ProtectedRoute>
          }
        />

        {/* User self-profile — any authenticated user */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AdminShell>
                <UserProfile />
              </AdminShell>
            </ProtectedRoute>
          }
        />

        {/* ===== Redirects 301 desde rutas /admin/... (Sprint 1.3) ===== */}
        <Route path="/admin/config" element={<Navigate to="/config" replace />} />
        <Route path="/admin/company/create" element={<Navigate to="/config/company/create" replace />} />
        <Route path="/admin/:companyId/config" element={<AdminCompanyConfigRedirect />} />
        <Route path="/admin/:companyId/:branchId/config" element={<AdminBranchConfigRedirect />} />
        <Route path="/admin/:companyId/:branchId/urls" element={<AdminBranchUrlsRedirect />} />
        {/* Sprint 3.4b — OpShell tiene contenido real, se activa el redirect */}
        <Route path="/admin/:companyId/:branchId" element={<AdminBranchRedirect />} />
        <Route
          path="/admin/:companyId/branch/create"
          element={
            <ProtectedRoute>
              <BranchCreate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/:companyId/:branchId/menu"
          element={
            <ProtectedRoute>
              <MenuAdmin />
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
