import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Header.css";

const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();

  // Solo mostrar el header en la landing page (ruta raíz)
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(lastScrollY > currentScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    // Solo agregar el listener si estamos en la landing page
    if (isLandingPage) {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [lastScrollY, isLandingPage]);

  const handleDemoClick = () => {
    const demoForm = document.getElementById("demo-form");
    if (demoForm) {
      demoForm.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // No renderizar el header si no estamos en la landing page
  if (!isLandingPage) {
    return null;
  }

  return (
    <header className={`fixed-header ${isVisible ? "visible" : ""}`}>
      <div className="logo-container">
        <a style={{ textDecoration: "none", color: "#333" }} href="/">
          <span className="header-title">HeyMozo</span>
        </a>
      </div>
      <button className="demo-button" onClick={handleDemoClick}>
        Obtener Demo
      </button>
    </header>
  );
};

export default Header;
