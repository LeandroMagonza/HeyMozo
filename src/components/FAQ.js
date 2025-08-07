import React, { useState } from "react";
import "./FAQ.css";

const faqData = [
  {
    category: "Primeros Pasos",
    questions: [
      {
        id: 1,
        question: "¿Qué es HeyMozo y cómo funciona?",
        answer:
          "HeyMozo es una plataforma digital que moderniza la comunicación entre meseros y comensales en restaurantes. Los clientes pueden solicitar atención, pedir la cuenta y acceder al menú escaneando un código QR desde su mesa, mientras que el personal del restaurante recibe notificaciones en tiempo real en su dashboard.",
      },
      {
        id: 2,
        question: "¿Cómo empiezo a usar HeyMozo en mi restaurante?",
        answer:
          "Es muy simple: 1) Solicita acceso desde nuestra página web, 2) Configura tu restaurante y sucursales en nuestro panel administrativo, 3) Agrega las mesas y genera los códigos QR, 4) Coloca los códigos QR en cada mesa. ¡Listo para usar!",
      },
      {
        id: 3,
        question: "¿Necesito cambiar mi menú actual?",
        answer:
          "¡No! HeyMozo se integra con tu menú existente. Solo necesitas el enlace de tu menú digital actual (si lo tienes) o podemos ayudarte a digitalizarlo. No hay necesidad de actualizar contenido en múltiples plataformas.",
      },
    ],
  },
  {
    category: "Configuración Técnica",
    questions: [
      {
        id: 4,
        question: "¿Qué dispositivos necesito para usar HeyMozo?",
        answer:
          "Para el personal: cualquier dispositivo con navegador web (computadora, tablet, smartphone). Para los clientes: solo su smartphone para escanear el código QR. No necesitas instalar aplicaciones adicionales.",
      },
      {
        id: 5,
        question: "¿Funciona sin internet o con conexión lenta?",
        answer:
          "HeyMozo requiere conexión a internet para funcionar. Sin embargo, está optimizado para funcionar bien incluso con conexiones lentas. Las notificaciones se entregan en tiempo real cuando hay conectividad.",
      },
      {
        id: 6,
        question: "¿Cómo genero los códigos QR para las mesas?",
        answer:
          "Desde el panel administrativo, puedes generar códigos QR únicos para cada mesa. Cada código está vinculado específicamente a una mesa y sucursal. Puedes descargarlos e imprimirlos fácilmente.",
      },
    ],
  },
  {
    category: "Funcionamiento",
    questions: [
      {
        id: 7,
        question: "¿Cómo solicitan atención los clientes?",
        answer:
          "Los clientes escanean el código QR de su mesa con la cámara de su teléfono, acceden a una interfaz simple donde pueden: ver el menú, llamar al mozo, solicitar la cuenta, o enviar comentarios. Todo sin descargar apps.",
      },
      {
        id: 8,
        question: "¿Cómo recibo las notificaciones en el restaurante?",
        answer:
          "El personal del restaurante ve todas las solicitudes en tiempo real desde el dashboard administrativo. Las notificaciones incluyen sonido y cambios visuales para identificar rápidamente qué mesa necesita atención y qué tipo de servicio requiere.",
      },
      {
        id: 9,
        question: "¿Puedo gestionar múltiples sucursales?",
        answer:
          "Sí, HeyMozo permite gestionar múltiples sucursales desde una sola cuenta. Cada sucursal tiene su propio dashboard independiente y puedes asignar permisos específicos a diferentes empleados por sucursal.",
      },
    ],
  },
  {
    category: "Costos y Planes",
    questions: [
      {
        id: 10,
        question: "¿Cuánto cuesta HeyMozo?",
        answer:
          "Ofrecemos diferentes planes según el tamaño de tu restaurante. Contáctanos para una cotización personalizada. Incluimos setup inicial, capacitación y soporte técnico sin costo adicional.",
      },
      {
        id: 11,
        question: "¿Hay costos ocultos o comisiones por transacción?",
        answer:
          "No. HeyMozo no cobra comisiones por transacción ni tiene costos ocultos. Pagas una tarifa mensual fija según tu plan y eso incluye todas las funcionalidades, actualizaciones y soporte.",
      },
      {
        id: 12,
        question: "¿Ofrecen período de prueba?",
        answer:
          "Sí, ofrecemos una demostración gratuita donde puedes probar todas las funcionalidades. Contáctanos y programaremos una demo personalizada para tu restaurante.",
      },
    ],
  },
  {
    category: "Soporte",
    questions: [
      {
        id: 13,
        question: "¿Qué soporte técnico ofrecen?",
        answer:
          "Ofrecemos soporte técnico completo que incluye: capacitación inicial para tu equipo, soporte vía email y chat, documentación detallada, y asistencia para la configuración inicial. Nuestro equipo está disponible para resolver cualquier duda.",
      },
      {
        id: 14,
        question: "¿Qué pasa si tengo problemas técnicos durante el servicio?",
        answer:
          "Tenemos soporte prioritario para incidencias durante horas de servicio. Además, HeyMozo está diseñado para ser estable y confiable, con sistemas de respaldo que minimizan las interrupciones.",
      },
      {
        id: 15,
        question: "¿Cómo contacto al equipo de soporte?",
        answer:
          "Puedes contactarnos a través del formulario en nuestra página web, por email, o desde el panel administrativo de HeyMozo. Respondemos todas las consultas en menos de 24 horas, y las urgencias durante el día.",
      },
    ],
  },
];

function FAQ() {
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Primeros Pasos");

  const toggleQuestion = (questionId) => {
    setActiveQuestion(activeQuestion === questionId ? null : questionId);
  };

  const handleContactSupport = () => {
    // Navegar a la landing page con el hash
    window.location.href = "/#contact-section";
  };

  const categories = [...new Set(faqData.map((item) => item.category))];

  return (
    <div className="faq-page">
      <header className="faq-header">
        <div className="faq-header-content">
          <a href="/" className="back-to-home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M12 19L5 12L12 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Volver al inicio
          </a>

          <div className="faq-title-section">
            <h1>Preguntas Frecuentes</h1>
            <p>
              Encuentra respuestas a las preguntas más comunes sobre HeyMozo
            </p>
          </div>

          <a href="/admin/login" className="login-button">
            Iniciar Sesión
          </a>
        </div>
      </header>

      <main className="faq-main">
        <div className="faq-container">
          <aside className="faq-sidebar">
            <nav className="faq-navigation">
              <h3>Categorías</h3>
              <ul>
                {categories.map((category) => (
                  <li key={category}>
                    <button
                      className={`category-button ${
                        activeCategory === category ? "active" : ""
                      }`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="faq-contact-card">
              <h4>¿No encuentras tu respuesta?</h4>
              <p>Nuestro equipo está aquí para ayudarte</p>
              <button onClick={handleContactSupport} className="contact-button">
                Contactar Soporte
              </button>
            </div>
          </aside>

          <div className="faq-content">
            {faqData
              .filter((section) => section.category === activeCategory)
              .map((section) => (
                <div key={section.category} className="faq-section">
                  <h2>{section.category}</h2>

                  <div className="faq-questions">
                    {section.questions.map((item) => (
                      <div key={item.id} className="faq-item">
                        <button
                          className={`faq-question ${
                            activeQuestion === item.id ? "active" : ""
                          }`}
                          onClick={() => toggleQuestion(item.id)}
                        >
                          <span>{item.question}</span>
                          <svg
                            className={`faq-icon ${
                              activeQuestion === item.id ? "rotated" : ""
                            }`}
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M6 9L12 15L18 9"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        <div
                          className={`faq-answer ${
                            activeQuestion === item.id ? "expanded" : ""
                          }`}
                        >
                          <div className="faq-answer-content">
                            <p>{item.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>

      <footer className="faq-footer">
        <div className="footer-bottom">
          <p>© 2025 HeyMozo - Transformando la experiencia gastronómica</p>
        </div>
      </footer>
    </div>
  );
}

export default FAQ;
