// src/components/UserScreen.js

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import ButtonsGroup from "./ButtonsGroup";
import EventsList from "./EventsList";
import "./UserScreen.css";
import { getCompany, getTable, updateTable } from "../services/api";
const { EventTypes } = require("../constants");

const UserScreen = () => {
  const { companyId, tableId } = useParams();
  const [company, setCompany] = useState(null);
  const [table, setTable] = useState(null);
  const [events, setEvents] = useState([]);
  const pageLoadTime = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companyResponse = await getCompany(companyId);
        setCompany(companyResponse.data);

        const tableResponse = await getTable(companyId, tableId);
        const tableData = tableResponse.data;

        const scanEvent = {
          type: EventTypes.SCAN,
          createdAt: new Date().toISOString(),
          message: null,
        };

        pageLoadTime.current = new Date(scanEvent.createdAt);

        const updatedTable = {
          ...tableData,
          events: [...tableData.events, scanEvent],
        };

        await updateTable(companyId, tableId, updatedTable);

        setTable(updatedTable);
        const filteredEvents = updatedTable.events.filter(
          (event) => new Date(event.createdAt) >= pageLoadTime.current
        );
        setEvents(
          filteredEvents.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      }
    };

    fetchData();
  }, [companyId, tableId]);

  const handleEventSubmit = async (eventType, message) => {
    try {
      const newEvent = {
        type: eventType,
        createdAt: new Date().toISOString(),
        message: message || null,
      };

      const updatedTable = {
        ...table,
        events: [...table.events, newEvent],
      };

      await updateTable(companyId, tableId, updatedTable);

      setTable(updatedTable);
      const filteredEvents = updatedTable.events.filter(
        (event) => new Date(event.createdAt) >= pageLoadTime.current
      );
      setEvents(
        filteredEvents.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
    } catch (error) {
      console.error("Error al enviar el evento:", error);
    }
  };

  if (!company || !table) {
    return <div>Cargando...</div>;
  }

  const texts = {
    showMenu: "Mostrar Menú",
    callWaiter: "Llamar al Mesero",
    requestCheck: "Solicitar Cuenta",
  };

  return (
    <div className="user-screen">
      <h1 className="restaurant-name">{company.name}</h1>

      <ButtonsGroup
        menuLink={company.url}
        texts={texts}
        onEventSubmit={handleEventSubmit}
      />

      <EventsList events={events} />
    </div>
  );
};

export default UserScreen;
