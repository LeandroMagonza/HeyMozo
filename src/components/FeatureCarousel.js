import React, { useState } from "react";
import "./FeatureCarousel.css";

const features = [
  {
    title: "Integra Tu Menú Existente",
    description:
      "Utiliza el mismo link de tu menú actual. Sin necesidad de actualizar contenido en múltiples plataformas",
    image:
      "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Llamado al Mozo",
    description:
      "Los comensales pueden solicitar atención sin necesidad de hacer señas o esperar a que el mozo se desocupe",
    image:
      "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Pedir la Cuenta",
    description:
      "Agiliza el proceso de pago permitiendo solicitar la cuenta desde la mesa y especificar metodo de pago antes de que la lleve el mozo",
    image:
      "https://images.unsplash.com/photo-1556742393-d75f468bfcb0?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Dashboard en Tiempo Real",
    description:
      "Control total de mesas y pedidos desde una interfaz intuitiva",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=500",
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
