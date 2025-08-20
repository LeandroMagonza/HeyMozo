// src/components/EventsList.js

import React, { useState, useEffect, useRef } from "react";
import "./EventsList.css";
import { EventColors } from "../theme";
import { translateEvent } from "../utils/translations";
import { FaCheckCircle } from "react-icons/fa";

const EventsList = ({ events, showSeenStatus = true, eventTypes = [], isAdminView = true }) => {
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollTop = useRef(0);
  const containerRef = useRef(null);

  // Helper function to get event type information
  const getEventTypeInfo = (event) => {
    // Check if this is a local user event with styling info
    if (event.type === 'user_generated' && event.eventName) {
      return {
        name: event.eventName,
        color: event.eventColor || '#007bff',
        fontColor: event.fontColor || '#ffffff'
      };
    }
    
    if (event.eventTypeId) {
      // Use dynamic EventType
      const eventType = eventTypes.find(et => et.id === event.eventTypeId);
      if (eventType) {
        return {
          name: isAdminView ? eventType.stateName : eventType.eventName,
          color: isAdminView ? eventType.adminColor : eventType.userColor,
          fontColor: isAdminView ? '#000000' : (eventType.userFontColor || '#ffffff')
        };
      }
    }
    
    // Fallback to legacy system
    return {
      name: translateEvent(event.type),
      color: EventColors[event.type] || '#f8f9fa',
      fontColor: '#000000'
    };
  };

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
    (a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
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
    const eventDate = new Date(event.createdAt || event.timestamp);
    const eventDateString = eventDate.toDateString();

    if (currentDate !== eventDateString) {
      currentDate = eventDateString;
      groupedEvents.push({
        type: "date-separator",
        date: eventDate,
        displayDate: formatDateForDisplay(event.createdAt || event.timestamp),
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

        const eventInfo = getEventTypeInfo(item);
        
        return (
          <li
            key={item.originalIndex}
            style={{ 
              backgroundColor: eventInfo.color,
              color: eventInfo.fontColor
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <strong style={{ color: eventInfo.fontColor }}>
                {eventInfo.name}
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
                  color: eventInfo.fontColor,
                  opacity: 0.8,
                  marginLeft: "10px",
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(item.createdAt || item.timestamp).toLocaleTimeString("es-ES", {
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
                  color: eventInfo.fontColor,
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