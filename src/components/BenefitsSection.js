import React, { useRef } from "react";
import "./BenefitsSection.css";

const benefits = [
  {
    id: 1,
    title: "Mejora la experiencia",
    description:
      "Tus clientes tendrán una experiencia más fluida y sin distracción",
    image:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=800&auto=format",
  },
  {
    id: 2,
    title: "Optimiza tiempos",
    description:
      "Reduce los traslados innecesarios de tus mozos permitiéndoles ser más eficientes en su trabajo",
    image:
      "https://images.unsplash.com/photo-1513530176992-0cf39c4cbed4?q=80&w=800&auto=format",
  },
  {
    id: 3,
    title: "Gestión eficiente",
    description: "Mejora la organización y el control de las mesas",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format",
  },
  {
    id: 4,
    title: "Mejor comunicación",
    description:
      "Facilita la interacción entre comensales y mozos de manera clara y efectiva",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format",
  },
];

const BenefitsSection = () => {
  const containerRef = useRef(null);

  const scroll = (direction) => {
    const container = containerRef.current;
    const scrollAmount = direction === "left" ? -400 : 400;
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="benefits-section">
      <h2>Beneficios</h2>
      <div className="benefits-wrapper">
        <div className="benefits-container" ref={containerRef}>
          {benefits.map((benefit) => (
            <div
              key={benefit.id}
              className="benefit-card"
              style={{ backgroundImage: `url(${benefit.image})` }}
            >
              <div className="benefit-content">
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="scroll-buttons">
          <button className="scroll-button" onClick={() => scroll("left")}>
            ←
          </button>
          <button className="scroll-button" onClick={() => scroll("right")}>
            →
          </button>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
