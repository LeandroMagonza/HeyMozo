import React, { useState, useEffect } from "react";
import "./Header.css";

const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(lastScrollY > currentScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleDemoClick = () => {
    const demoForm = document.getElementById("demo-form");
    if (demoForm) {
      demoForm.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <header className={`fixed-header ${isVisible ? "visible" : ""}`}>
      <div className="logo-container">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/heymozo-logo-lAd92AUlDVMY1PI8cSvsGEVNsGN0P2.png"
          alt="HeyMozo Logo"
          className="header-logo"
        />
        <span className="header-title">HeyMozo</span>
      </div>
      <button className="demo-button" onClick={handleDemoClick}>
        Obtener Demo
      </button>
    </header>
  );
};

export default Header;
