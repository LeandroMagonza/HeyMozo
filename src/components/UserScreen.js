// src/components/UserScreen.js

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ButtonsGroup from './ButtonsGroup';
import EventsList from './EventsList';
import './UserScreen.css';
const { EventTypes } = require('../constants');

const UserScreen = () => {
  const { tableId } = useParams();
  const [branchName, setBranchName] = useState('Nombre de la Sucursal');
  const [menuLink, setMenuLink] = useState('');
  const [texts, setTexts] = useState({
    showMenu: 'Mostrar Menú',
    callWaiter: 'Llamar al Mesero',
    requestCheck: 'Solicitar Cuenta',
  });

  const [table, setTable] = useState(null);
  const [events, setEvents] = useState([]);
  const pageLoadTime = useRef(null);

  useEffect(() => {
    // Obtener los datos de la mesa y enviar el evento SCAN
    const fetchTableData = async () => {
      try {
        const response = await axios.get(`/api/tables/${tableId}`);
        const tableData = response.data;

        // Crear el evento SCAN
        const scanEvent = {
          type: EventTypes.SCAN, // Usamos EventTypes
          createdAt: new Date().toISOString(),
          message: null,
        };

        // Establecer el tiempo de carga de la página al tiempo de creación del evento SCAN
        pageLoadTime.current = new Date(scanEvent.createdAt);

        // Actualizar la mesa con el nuevo evento
        const updatedTable = {
          ...tableData,
          events: [...tableData.events, scanEvent],
        };

        // Enviar la actualización al servidor
        await axios.put(`/api/tables/${tableId}`, updatedTable);

        // Actualizar el estado local
        setTable(updatedTable);
        // Filtrar los eventos desde el momento en que se abrió la página
        const filteredEvents = updatedTable.events.filter(
          (event) => new Date(event.createdAt) >= pageLoadTime.current
        );
        // Ordenar los eventos en orden descendente por fecha de creación
        setEvents(
          filteredEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
      } catch (error) {
        console.error('Error al obtener los datos de la mesa:', error);
      }
    };

    fetchTableData();
  }, [tableId]);

  // Función para manejar el envío de eventos desde el modal
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

      // Enviar la actualización al servidor
      await axios.put(`/api/tables/${tableId}`, updatedTable);

      // Actualizar el estado local
      setTable(updatedTable);
      // Filtrar los eventos desde el momento en que se abrió la página
      const filteredEvents = updatedTable.events.filter(
        (event) => new Date(event.createdAt) >= pageLoadTime.current
      );
      // Ordenar los eventos en orden descendente por fecha de creación
      setEvents(
        filteredEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    } catch (error) {
      console.error('Error al enviar el evento:', error);
    }
  };

  return (
    <div className="user-screen">
      <h1 className="restaurant-name">{branchName}</h1>

      <ButtonsGroup
        menuLink={menuLink}
        texts={texts}
        onEventSubmit={handleEventSubmit}
      />

      <EventsList events={events} />
    </div>
  );
};

export default UserScreen;
