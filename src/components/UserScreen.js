// src/components/UserScreen.js

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ButtonsGroup from './ButtonsGroup';
import EventsList from './EventsList';
import './UserScreen.css';
import api, { getTable, updateTable } from '../services/api';
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
    const fetchTableData = async () => {
      try {
        const response = await getTable(tableId);
        const tableData = response.data;

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

        await updateTable(tableId, updatedTable);

        setTable(updatedTable);
        const filteredEvents = updatedTable.events.filter(
          (event) => new Date(event.createdAt) >= pageLoadTime.current
        );
        setEvents(
          filteredEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
      } catch (error) {
        console.error('Error al obtener los datos de la mesa:', error);
      }
    };

    fetchTableData();
  }, [tableId]);

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

      await updateTable(tableId, updatedTable);

      setTable(updatedTable);
      const filteredEvents = updatedTable.events.filter(
        (event) => new Date(event.createdAt) >= pageLoadTime.current
      );
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
