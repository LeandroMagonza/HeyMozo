import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getCompany, getBranch, getTables, updateTable } from '../services/api';
import './AdminScreen.css';
import './AdminModal.css';
import EventsList from './EventsList';
import { TableStates, TableColors } from '../theme';
import { FaHistory, FaCheckCircle, FaSignOutAlt, FaSignInAlt, FaUser, FaFileInvoiceDollar } from 'react-icons/fa';
const { EventTypes } = require('../constants');

const AdminScreen = () => {
  const { companyId, branchId } = useParams();
  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const refreshInterval = 15000; // Cambiado a milisegundos
  const [refreshCountdown, setRefreshCountdown] = useState(refreshInterval / 1000);

  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedTableEvents, setSelectedTableEvents] = useState([]);
  const [selectedTableNumber, setSelectedTableNumber] = useState('');
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [sortType, setSortType] = useState('priority'); // Nuevo estado para el tipo de ordenamiento

  // Función para obtener los datos
  const fetchData = useCallback(async () => {
    try {
      const companyResponse = await getCompany(companyId);
      setCompany(companyResponse.data);

      const branchResponse = await getBranch(branchId);
      setBranch(branchResponse.data);

      const tablesResponse = await getTables(branchId);
      setTables(tablesResponse.data);
      console.log('Tablas obtenidas:', tablesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error.response || error);
    }
  }, [companyId, branchId]);

  // Efecto para el refresco inicial y periódico
  useEffect(() => {
    fetchData(); // Carga inicial de datos

    const intervalId = setInterval(() => {
      fetchData(); // Refresco periódico
      setRefreshCountdown(refreshInterval / 1000); // Reinicia la cuenta regresiva
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchData, refreshInterval]);

  // Efecto para la cuenta regresiva
  useEffect(() => {
    const countdownId = setInterval(() => {
      setRefreshCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          return refreshInterval / 1000;
        }
        return prevCountdown - 1;
      });
    }, 1000);

    return () => clearInterval(countdownId);
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
  const getTableStateAndWaitTime = (events, currentTime) => {
    if (events.length === 0) return { state: TableStates.AVAILABLE, waitTime: 0 };

    let state = TableStates.AVAILABLE;
    let waitTime = 0;
    let firstAttentionTime = null;
    let lastOccupiedTime = null;
    let hasUnseenAttention = false;
    let lastAvailableTime = new Date(events[0].createdAt);
    let lastSeenOrAvailableTime = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventTime = new Date(event.createdAt);

      switch (event.type) {
        case EventTypes.MARK_AVAILABLE:
          state = TableStates.AVAILABLE;
          lastAvailableTime = eventTime;
          hasUnseenAttention = false;
          firstAttentionTime = null;
          lastOccupiedTime = null;
          lastSeenOrAvailableTime = eventTime;
          break;

        case EventTypes.SCAN:
        case EventTypes.MARK_OCCUPIED:
          if (state === TableStates.AVAILABLE) {
            state = TableStates.OCCUPIED;
            lastOccupiedTime = eventTime;
          }
          break;

        case EventTypes.CALL_WAITER:
        case EventTypes.REQUEST_CHECK:
          if (lastSeenOrAvailableTime === null || eventTime > lastSeenOrAvailableTime) {
            hasUnseenAttention = true;
            if (!firstAttentionTime) {
              firstAttentionTime = eventTime;
            }
            if (event.type === EventTypes.CALL_WAITER) {
              state = state === TableStates.CHECK ? TableStates.WAITER_AND_CHECK : TableStates.WAITER;
            } else {
              state = state === TableStates.WAITER ? TableStates.WAITER_AND_CHECK : TableStates.CHECK;
            }
          }
          break;

        case EventTypes.MARK_SEEN:
          lastSeenOrAvailableTime = eventTime;
          if (hasUnseenAttention) {
            hasUnseenAttention = false;
            state = TableStates.OCCUPIED;
            firstAttentionTime = null;
          }
          break;
      }
    }

    // Calcular el tiempo de espera basado en el estado final
    if (state === TableStates.AVAILABLE) {
      waitTime = currentTime - lastAvailableTime;
    } else if (hasUnseenAttention) {
      waitTime = currentTime - firstAttentionTime;
    } else if (lastOccupiedTime) {
      waitTime = currentTime - lastOccupiedTime;
    }

    return { state, waitTime, firstAttentionTime, hasUnseenAttention };
  };

  // Función para contar eventos no vistos con mensaje y verificar si hay eventos sin mensaje
  const countUnseenEvents = (events) => {
    let countWithMessage = 0;
    let hasUnseenWithoutMessage = false;
    let hasUnseenWithMessage = false;
    let lastSeenOrAvailableTime = null;

    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === EventTypes.MARK_SEEN || event.type === EventTypes.MARK_AVAILABLE) {
        lastSeenOrAvailableTime = new Date(event.createdAt);
      } else if ((event.type === EventTypes.CALL_WAITER || event.type === EventTypes.REQUEST_CHECK) &&
                 (lastSeenOrAvailableTime === null || new Date(event.createdAt) > lastSeenOrAvailableTime)) {
        if (event.message) {
          countWithMessage++;
          hasUnseenWithMessage = true;
        } else {
          hasUnseenWithoutMessage = true;
        }
      }
    }
    return {
      countWithMessage: countWithMessage,
      hasUnseenWithoutMessage: hasUnseenWithoutMessage,
      hasUnseenWithMessage: hasUnseenWithMessage,
      totalUnseen: countWithMessage + (hasUnseenWithoutMessage ? 1 : 0)
    };
  };

  // Procesar las mesas con los datos calculados
  const processedTables = useMemo(() => {
    console.log('Procesando mesas:', tables);
    return tables.map((table, index) => {
      const { state, waitTime, firstAttentionTime, hasUnseenAttention } = getTableStateAndWaitTime(table.events, currentTime);
      console.log(`Mesa ${table.id} - Estado calculado:`, state);
      const unseenEvents = countUnseenEvents(table.events);
      const canMarkSeenFromOutside = unseenEvents.hasUnseenWithoutMessage && !unseenEvents.hasUnseenWithMessage && hasUnseenAttention;
      return { 
        ...table, 
        number: index + 1, // Calcular el número de mesa basado en el índice
        state, 
        unseenCount: unseenEvents.countWithMessage,
        canMarkSeenFromOutside, 
        waitTime,
        firstAttentionTime,
        hasUnseenAttention
      };
    });
  }, [tables, currentTime]);

  // Nueva función para manejar el cambio de ordenamiento
  const handleSortChange = (event) => {
    setSortType(event.target.value);
  };

  // Modificar la lógica de ordenamiento en sortedTables
  const sortedTables = useMemo(() => {
    return [...processedTables].sort((a, b) => {
      if (sortType === 'priority') {
        if (a.state !== b.state) {
          const stateOrder = {
            [TableStates.WAITER_AND_CHECK]: 0,
            [TableStates.WAITER]: 1,
            [TableStates.CHECK]: 2,
            [TableStates.OCCUPIED]: 3,
            [TableStates.AVAILABLE]: 4
          };
          return stateOrder[a.state] - stateOrder[b.state];
        }
        return b.waitTime - a.waitTime;
      } else {
        // Ordenar por número de mesa
        return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
  }, [processedTables, sortType]); // Añadir sortType como dependencia

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
    setSelectedTableId(tableId);
    setShowEventsModal(true);
  };

  // Función para cerrar el modal de eventos
  const closeEventsModal = () => {
    setShowEventsModal(false);
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
      const tablesResponse = await getTables(branchId);
      setTables(tablesResponse.data);
      console.log('Eventos marcados como vistos para la mesa:', tableId);
    } catch (error) {
      console.error('Error al marcar eventos como vistos:', error);
    }
  };

  // Función para marcar la mesa como disponible
  const markAsAvailable = async (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newEvent = {
      type: EventTypes.MARK_AVAILABLE,
      createdAt: new Date().toISOString(),
      message: null,
    };

    const updatedTable = {
      ...table,
      events: [...table.events, newEvent],
    };

    try {
      await updateTable(tableId, updatedTable);
      const tablesResponse = await getTables(branchId);
      setTables(tablesResponse.data);
      console.log('Mesa marcada como disponible:', tableId);
    } catch (error) {
      console.error('Error al marcar la mesa como disponible:', error);
    }
  };

  // Función para marcar la mesa como ocupada
  const markAsOccupied = async (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newEvent = {
      type: EventTypes.MARK_OCCUPIED,
      createdAt: new Date().toISOString(),
      message: null,
    };

    const updatedTable = {
      ...table,
      events: [...table.events, newEvent],
    };

    try {
      await updateTable(tableId, updatedTable);
      const tablesResponse = await getTables(branchId);
      setTables(tablesResponse.data);
      console.log('Mesa marcada como ocupada:', tableId);
    } catch (error) {
      console.error('Error al marcar la mesa como ocupada:', error);
    }
  };

  return (
    <div className="admin-screen">
      <h1>{company?.name || 'Cargando...'}</h1>
      <h2>{branch?.name || 'Cargando...'}</h2>
      <div className="refresh-timer">
        Refrescando en {refreshCountdown} segundos
      </div>
      {/* Añadir selector de ordenamiento */}
      <div className="sort-selector">
        <label htmlFor="sort-type">Ordenar por: </label>
        <select id="sort-type" value={sortType} onChange={handleSortChange}>
          <option value="priority">Prioridad de atención</option>
          <option value="tableNumber">Número de mesa</option>
        </select>
      </div>
      <table className="tables-list">
        <thead>
          <tr>
            <th>Número</th>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Tiempo de espera</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedTables.map((table) => (
            <tr key={table.id} style={{ backgroundColor: TableColors[table.state] }}>
              <td>{table.number}</td>
              <td>{table.tableName || '-'}</td>
              <td>{table.state}</td>
              <td>{msToTime(table.waitTime)}</td>
              <td>
                <div className="table-actions">
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
                  disabled={!processedTables.find(t => t.id === selectedTableId)?.hasUnseenAttention}
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
