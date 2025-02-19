import React, { useState } from "react";
import "./FeatureCarousel.css";

const features = [
  {
    title: "Menú Digital QR",
    description:
      "Tus clientes acceden al menú actualizado escaneando el código de su mesa",
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Llamado al Mozo",
    description:
      "Los comensales pueden solicitar atención sin necesidad de hacer señas",
    image:
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Pedir la Cuenta",
    description:
      "Agiliza el proceso de pago permitiendo solicitar la cuenta desde la mesa",
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Dashboard en Tiempo Real",
    description:
      "Control total de mesas y pedidos desde una interfaz intuitiva",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=500",
  },
];

function FeatureCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % features.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + features.length) % features.length
    );
  };

  return (
    <div className="carousel-container">
      <div className="carousel-content">
        <div className="feature-info">
          <h3>{features[currentIndex].title}</h3>
          <p>{features[currentIndex].description}</p>
          <div className="carousel-controls">
            <button className="carousel-button prev" onClick={prevSlide}>
              &lt;
            </button>
            <div className="carousel-dots">
              {features.map((_, index) => (
                <span
                  key={index}
                  className={`dot ${index === currentIndex ? "active" : ""}`}
                />
              ))}
            </div>
            <button className="carousel-button next" onClick={nextSlide}>
              &gt;
            </button>
          </div>
        </div>
        <div className="feature-image">
          <img
            src={features[currentIndex].image}
            alt={features[currentIndex].title}
          />
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
