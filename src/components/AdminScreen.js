// src/components/AdminScreen.js

import React, { useState, useEffect, useMemo } from 'react';
import { getTables, updateTable } from '../services/api';
import './AdminScreen.css';
import './AdminModal.css';
import EventsList from './EventsList';
import { TableStates, TableColors } from '../theme';
import { FaHistory, FaCheckCircle, FaSignOutAlt, FaSignInAlt, FaUser, FaFileInvoiceDollar } from 'react-icons/fa';
const { EventTypes } = require('../constants');

const AdminScreen = () => {
  const [tables, setTables] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const companyName = 'Nombre de la Compañía';
  const branchName = 'Nombre de la Sucursal';
  const refreshInterval = 15; // Intervalo de refresco en segundos
  const [refreshCountdown, setRefreshCountdown] = useState(refreshInterval);

  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedTableEvents, setSelectedTableEvents] = useState([]);
  const [selectedTableNumber, setSelectedTableNumber] = useState('');
  const [selectedTableId, setSelectedTableId] = useState(null);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        console.log('Attempting to fetch tables...');
        const response = await getTables();
        console.log('Fetched tables:', response.data);
        setTables(response.data);
      } catch (error) {
        console.error('Error fetching tables:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error setting up request:', error.message);
        }
      }
    };

    fetchTables();

    const intervalId = setInterval(fetchTables, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setRefreshCountdown((prevCountdown) =>
        prevCountdown > 0 ? prevCountdown - 1 : refreshInterval
      );
    }, 1000);

    return () => clearInterval(countdown);
  }, [refreshInterval]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Función para convertir milisegundos a formato hh:mm:ss
  const msToTime = (duration) => {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor(duration / (1000 * 60 * 60));

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Función para determinar el estado de la mesa
  const getTableState = (events) => {
    if (events.length === 0) return TableStates.AVAILABLE;
    
    const lastEvent = events[events.length - 1];
    if ([EventTypes.SCAN, EventTypes.MARK_OCCUPIED, EventTypes.MARK_SEEN].includes(lastEvent.type)) {
      return TableStates.OCCUPIED;
    }
    if (lastEvent.type === EventTypes.MARK_AVAILABLE) {
      return TableStates.AVAILABLE;
    }

    let hasWaiter = false;
    let hasCheck = false;
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === EventTypes.MARK_SEEN) break;
      if (event.type === EventTypes.CALL_WAITER) hasWaiter = true;
      if (event.type === EventTypes.REQUEST_CHECK) hasCheck = true;
      if (hasWaiter && hasCheck) return TableStates.WAITER_AND_CHECK;
    }
    if (hasWaiter) return TableStates.WAITER;
    if (hasCheck) return TableStates.CHECK;
    return TableStates.OCCUPIED;
  };

  // Función para contar eventos no vistos con mensaje
  const countUnseenEventsWithMessage = (events) => {
    let count = 0;
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === EventTypes.MARK_SEEN) break;
      if ((event.type === EventTypes.CALL_WAITER || event.type === EventTypes.REQUEST_CHECK) && event.message) {
        count++;
      }
    }
    return count;
  };

  // Función para verificar si hay eventos no vistos sin mensaje
  const hasUnseenEventsWithoutMessage = (events) => {
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === EventTypes.MARK_SEEN) break;
      if ((event.type === EventTypes.CALL_WAITER || event.type === EventTypes.REQUEST_CHECK) && !event.message) {
        return true;
      }
    }
    return false;
  };

  // Función para marcar eventos como vistos
  const markEventsAsSeen = async (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newEvent = {
      type: EventTypes.MARK_SEEN,
      createdAt: new Date().toISOString(),
      message: null,
    };

    const updatedTable = {
      ...table,
      events: [...table.events, newEvent],
    };

    try {
      await updateTable(tableId, updatedTable);
      const response = await getTables();
      setTables(response.data);
      
      if (selectedTableId === tableId) {
        setSelectedTableEvents([newEvent, ...selectedTableEvents]);
      }
    } catch (error) {
      console.error('Error al marcar eventos como vistos:', error);
    }
  };

  // Procesar las mesas con los datos calculados
  const processedTables = useMemo(() => {
    return tables.map(table => {
      const state = getTableState(table.events);
      const unseenCount = countUnseenEventsWithMessage(table.events);
      const canMarkSeenFromOutside = hasUnseenEventsWithoutMessage(table.events);
      return { ...table, state, unseenCount, canMarkSeenFromOutside };
    });
  }, [tables]);

  // Función para ordenar las mesas
  const sortTables = (tables) => {
    return tables.sort((a, b) => {
      if (a.state !== b.state) {
        const stateOrder = { [TableStates.WAITER]: 0, [TableStates.CHECK]: 1, [TableStates.OCCUPIED]: 2, [TableStates.AVAILABLE]: 3 };
        return stateOrder[a.state] - stateOrder[b.state];
      }
      return b.waitTime - a.waitTime;
    });
  };

  // Ordenar las mesas procesadas
  const sortedTables = useMemo(() => sortTables(processedTables), [processedTables]);

  // Función para formatear el tiempo de espera
  const formatWaitTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  // Función para ver el historial de eventos
  const viewEventHistory = (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    // Ordenar los eventos en orden descendente por fecha de creación
    const sortedEvents = [...table.events].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    setSelectedTableEvents(sortedEvents);
    setSelectedTableNumber(table.number);
    setSelectedTableId(tableId); // Guardamos el ID de la tabla seleccionada
    setShowEventsModal(true);
  };

  // Función para cerrar el modal de eventos
  const closeEventsModal = () => {
    setShowEventsModal(false);
  };

  // Función para marcar la mesa como disponible (agrega un evento MARK_AVAILABLE)
  const markAsAvailable = async (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newEvent = {
      type: EventTypes.MARK_AVAILABLE,
      createdAt: new Date().toISOString(),
      message: null,
    };

    // Actualizar la mesa con el nuevo evento
    const updatedTable = {
      ...table,
      events: [...table.events, newEvent],
    };

    try {
      await updateTable(tableId, updatedTable);
      const response = await getTables();
      setTables(response.data);
    } catch (error) {
      console.error('Error al actualizar la mesa:', error);
    }
  };

  // Función para marcar la mesa como ocupada (agrega un evento MARK_OCCUPIED)
  const markAsOccupied = async (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newEvent = {
      type: EventTypes.MARK_OCCUPIED,
      createdAt: new Date().toISOString(),
      message: null,
    };

    // Actualizar la mesa con el nuevo evento
    const updatedTable = {
      ...table,
      events: [...table.events, newEvent],
    };

    try {
      await updateTable(tableId, updatedTable);
      const response = await getTables();
      setTables(response.data);
    } catch (error) {
      console.error('Error al actualizar la mesa:', error);
    }
  };

  return (
    <div className="admin-screen">
      <h1>{companyName}</h1>
      <h2>{branchName}</h2>
      <div className="refresh-timer">
        Refrescando en {refreshCountdown} segundos
      </div>
      <table className="tables-list">
        <thead>
          <tr>
            <th>Número</th>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedTables.map((table) => (
            <tr key={table.id} style={{ backgroundColor: TableColors[table.state] }}>
              <td>{table.number}</td>
              <td>{table.name || '-'}</td>
              <td>{table.state}</td>
              <td>
                <button className="app-button" onClick={() => viewEventHistory(table.id)}>
                  <FaHistory /> Historial
                  {table.unseenCount > 0 && <span className="unseen-count">{table.unseenCount}</span>}
                </button>
                {table.canMarkSeenFromOutside && (
                  <button className="app-button" onClick={() => markEventsAsSeen(table.id)}>
                    <FaCheckCircle /> Marcar Visto
                  </button>
                )}
                {table.state === TableStates.AVAILABLE && (
                  <button className="app-button" onClick={() => markAsOccupied(table.id)}>
                    <FaSignInAlt /> Ocupar
                  </button>
                )}
                {table.state !== TableStates.AVAILABLE && (
                  <button className="app-button" onClick={() => markAsAvailable(table.id)}>
                    <FaSignOutAlt /> Liberar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal para mostrar el historial de eventos */}
      {showEventsModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Historial de Eventos - Mesa {selectedTableNumber}</h2>
              <button className="app-button close-button" onClick={closeEventsModal}>
                Cerrar
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-actions">
                <button 
                  className="app-button" 
                  onClick={() => markEventsAsSeen(selectedTableId)}
                  disabled={!selectedTableEvents.some(e => 
                    (e.type === EventTypes.CALL_WAITER || e.type === EventTypes.REQUEST_CHECK) && 
                    !e.message
                  )}
                >
                  <FaCheckCircle /> Marcar Vistos
                </button>
              </div>
              <div className="events-list-container">
                <EventsList events={selectedTableEvents} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScreen;