import React from "react";
import "./HowItWorks.css";

const steps = [
  {
    id: 1,
    title: "Configura",
    description: "Arma tu listado de mesas",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format",
    gridArea: "large",
  },
  {
    id: 2,
    title: "Genera QRs",
    description: "El QR generado para poner en cada mesa",
    image:
      "https://images.unsplash.com/photo-1595079676601-f1adf5be5dee?q=80&w=800&auto=format",
    gridArea: "medium",
  },
  {
    id: 3,
    title: "Conecta",
    description: "Los clientes escanean y acceden a todas las funciones",
    image:
      "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=800&auto=format",
    gridArea: "small",
  },
  {
    id: 4,
    title: "Gestiona",
    description: "Administra pedidos y mesas en tiempo real",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format",
    gridArea: "wide",
  },
];

const HowItWorks = () => {
  return (
    <section className="how-it-works">
      <div className="how-it-works-container">
        <h2>Simple y Efectivo</h2>
        <div className="steps-grid">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`step-card ${step.gridArea}`}
              style={{ backgroundImage: `url(${step.image})` }}
            >
              <div className="step-overlay">
                <div className="step-number">{step.id}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
