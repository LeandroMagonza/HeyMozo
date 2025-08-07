import React, { useState, useEffect } from "react";
import "./FeatureCarousel.css";

const features = [
  {
    title: "Integra Tu Menú Existente",
    description:
      "Utiliza el mismo link de tu menú actual. Sin necesidad de actualizar contenido en múltiples plataformas",
    image: "/images/viewUser.png",
  },
  {
    title: "Llamado al Mozo",
    description:
      "Los comensales pueden solicitar atención sin necesidad de hacer señas o esperar a que el mozo se desocupe",
    image: "/images/LlamarMozo.png",
  },
  {
    title: "Pedir la Cuenta",
    description:
      "Agiliza el proceso de pago permitiendo solicitar la cuenta desde la mesa y especificar método de pago antes de que la lleve el mozo",
    image:
      "https://images.unsplash.com/photo-1556742393-d75f468bfcb0?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Dashboard en Tiempo Real",
    description:
      "Control total de mesas y pedidos desde una interfaz intuitiva",
    image: "images/computadora.png",
  },
];

function FeatureCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % features.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + features.length) % features.length
    );
  };

  const goToSlide = (index) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <div className="carousel-wrapper">
      <div className="carousel-container">
        <div className="carousel-content">
          <div className="feature-content">
            <div className="feature-info">
              <h3>{features[currentIndex].title}</h3>
              <p>{features[currentIndex].description}</p>
            </div>

            <div className="feature-image-container">
              <div className="feature-image">
                <img
                  src={features[currentIndex].image}
                  alt={features[currentIndex].title}
                />
              </div>
            </div>
          </div>

          <div className="carousel-navigation">
            <button
              className="carousel-button prev"
              onClick={prevSlide}
              aria-label="Anterior"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="carousel-indicators">
              {features.map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${
                    index === currentIndex ? "active" : ""
                  }`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Ir a slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              className="carousel-button next"
              onClick={nextSlide}
              aria-label="Siguiente"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
