// src/components/EventsList.js

import React, { useState, useEffect, useRef } from "react";
import "./EventsList.css";
import { EventColors } from "../theme";
import { translateEvent } from "../utils/translations";
import { FaCheckCircle } from "react-icons/fa";

const EventsList = ({ events, showSeenStatus = true }) => {
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollTop = useRef(0);
  const containerRef = useRef(null);

  // Detectar dirección del scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const currentScrollTop = containerRef.current.scrollTop;
      const isScrollingDownNow = currentScrollTop > lastScrollTop.current;

      if (Math.abs(currentScrollTop - lastScrollTop.current) > 5) {
        setIsScrollingDown(isScrollingDownNow);
      }

      lastScrollTop.current = currentScrollTop;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Ordenar eventos por fecha, más reciente primero
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Función para formatear la fecha como WhatsApp
  const formatDateForDisplay = (date) => {
    const eventDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Resetear horas para comparación
    const eventDateOnly = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const yesterdayOnly = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    if (eventDateOnly.getTime() === todayOnly.getTime()) {
      return "Hoy";
    } else if (eventDateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Ayer";
    } else {
      return eventDate.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  // Agrupar eventos por fecha
  const groupedEvents = [];
  let currentDate = null;

  sortedEvents.forEach((event, index) => {
    const eventDate = new Date(event.createdAt);
    const eventDateString = eventDate.toDateString();

    if (currentDate !== eventDateString) {
      currentDate = eventDateString;
      groupedEvents.push({
        type: "date-separator",
        date: eventDate,
        displayDate: formatDateForDisplay(event.createdAt),
      });
    }

    groupedEvents.push({ ...event, originalIndex: index });
  });

  return (
    <ul className="events-list" ref={containerRef}>
      {groupedEvents.map((item, index) => {
        if (item.type === "date-separator") {
          return (
            <li
              key={`date-${index}`}
              className={`date-separator ${isScrollingDown ? "hide-date" : ""}`}
            >
              <div className="floating-date">{item.displayDate}</div>
            </li>
          );
        }

        return (
          <li
            key={item.originalIndex}
            style={{ backgroundColor: EventColors[item.type] }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <strong>
                {translateEvent(item.type)}
                {showSeenStatus && item.seenAt && (
                  <FaCheckCircle
                    style={{ marginLeft: "5px", color: "#4CAF50" }}
                    title={`Visto: ${new Date(item.seenAt).toLocaleString()}`}
                  />
                )}
              </strong>
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginLeft: "10px",
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(item.createdAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {item.message && (
              <p
                style={{
                  margin: "5px 0 0 0",
                  textAlign: "left",
                }}
              >
                Mensaje: {item.message}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default EventsList;
