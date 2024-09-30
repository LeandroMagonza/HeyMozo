// src/components/AdminScreen.js

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getCompany, getTables, updateTable } from "../services/api";
import "./AdminScreen.css";
import "./AdminModal.css";
import EventsList from "./EventsList";
const { EventTypes } = require("../constants");

// Definición de los posibles estados de la mesa
const TableStates = {
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  WAITER: "WAITER",
  CHECK: "CHECK",
};

const AdminScreen = () => {
  const { companyId } = useParams();

  const [company, setCompany] = useState(null);
  const [tables, setTables] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const refreshInterval = 15; // Intervalo de refresco en segundos
  const [refreshCountdown, setRefreshCountdown] = useState(refreshInterval);

  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedTableEvents, setSelectedTableEvents] = useState([]);
  const [selectedTableNumber, setSelectedTableNumber] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyAndTables = async () => {
      setIsLoading(true);
      try {
        const companyResponse = await getCompany(companyId);
        const tablesResponse = await getTables(companyId);

        setCompany(companyResponse.data);

        if (
          Array.isArray(tablesResponse.data) &&
          tablesResponse.data.length > 0
        ) {
          setTables(tablesResponse.data);
        } else {
          console.error(
            "Received invalid or empty tables data:",
            tablesResponse.data
          );
          setTables([]);
        }
      } catch (error) {
        console.error("Error fetching company and tables:", error);
        setTables([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyAndTables();

    const intervalId = setInterval(
      fetchCompanyAndTables,
      refreshInterval * 1000
    );

    return () => clearInterval(intervalId);
  }, [companyId, refreshInterval]);

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

  // Función para determinar el estado de la mesa según los eventos
  const getTableState = (events) => {
    if (events.length === 0) return TableStates.AVAILABLE;

    // Obtener el último evento
    const lastEvent = events[events.length - 1];

    if (lastEvent.type === EventTypes.MARK_AVAILABLE) {
      return TableStates.AVAILABLE;
    }

    // Verificar si hay eventos no vistos que requieren atención
    const { unseenEvents } = getUnseenEvents(events);

    if (unseenEvents.some((e) => e.type === EventTypes.CALL_WAITER)) {
      return TableStates.WAITER;
    }

    if (unseenEvents.some((e) => e.type === EventTypes.REQUEST_CHECK)) {
      return TableStates.CHECK;
    }

    if (
      lastEvent.type === EventTypes.SCAN ||
      lastEvent.type === EventTypes.MARK_OCCUPIED ||
      lastEvent.type === EventTypes.CALL_WAITER ||
      lastEvent.type === EventTypes.REQUEST_CHECK ||
      lastEvent.type === EventTypes.MARK_SEEN
    ) {
      return TableStates.OCCUPIED;
    }

    return TableStates.AVAILABLE;
  };

  // Función para obtener eventos no vistos y el temporizador
  const getUnseenEvents = (events) => {
    const unseenEvents = [];
    let attentionEvent = null;

    // Recorrer eventos desde el más reciente al más antiguo
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];

      if (
        event.type === EventTypes.MARK_SEEN ||
        event.type === EventTypes.MARK_AVAILABLE
      ) {
        break; // Detenerse al encontrar un evento de marcar como visto
      }

      if (
        event.type === EventTypes.CALL_WAITER ||
        event.type === EventTypes.REQUEST_CHECK
      ) {
        unseenEvents.push(event);
        attentionEvent = event;
      }
    }

    // Calcular el temporizador desde el evento que requiere atención
    let timer = null;
    if (attentionEvent) {
      const timeDiff = currentTime - new Date(attentionEvent.createdAt);
      timer = msToTime(timeDiff);
    }

    return {
      unseenEvents: unseenEvents.reverse(), // Para mantener el orden cronológico
      unseenEventsCount: unseenEvents.length,
      timer: timer,
    };
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
    setShowEventsModal(true);
  };

  // Función para cerrar el modal de eventos
  const closeEventsModal = () => {
    setShowEventsModal(false);
  };

  // Función para marcar eventos como vistos (agrega un evento MARK_SEEN)
  const markEventsAsSeen = async (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newEvent = {
      type: EventTypes.MARK_SEEN,
      createdAt: new Date().toISOString(),
      message: null,
    };

    // Actualizar la mesa con el nuevo evento
    const updatedTable = {
      ...table,
      events: [...table.events, newEvent],
    };

    try {
      await updateTable(companyId, tableId, updatedTable);
      const response = await getTables(companyId);
      setTables(response.data);
    } catch (error) {
      console.error("Error al actualizar los eventos:", error);
    }
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
      await updateTable(companyId, tableId, updatedTable);
      const response = await getTables(companyId);
      setTables(response.data);
    } catch (error) {
      console.error("Error al actualizar la mesa:", error);
    }
  };

  // Función para marcar la mesa como ocupada (agrega un evento MARK_OCCUPIED)
  const markAsOccupied = async (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) {
      console.error("Table not found:", tableId);
      return;
    }

    const newEvent = {
      type: EventTypes.MARK_OCCUPIED,
      createdAt: new Date().toISOString(),
      message: null,
    };

    const updatedTable = {
      ...table,
      events: [...table.events, newEvent],
    };

    console.log("Sending update request for table:", tableId);
    console.log("Updated table data:", JSON.stringify(updatedTable));

    try {
      const result = await updateTable(companyId, tableId, updatedTable);
      console.log("Update successful:", result);
      // Actualizar el estado local con la nueva información
      setTables((prevTables) =>
        prevTables.map((t) => (t.id === tableId ? result : t))
      );
    } catch (error) {
      console.error("Error updating table:", error);
      // Aquí puedes agregar lógica para mostrar un mensaje de error al usuario
    }
  };

  // Utilizar useMemo para procesar las mesas con los datos calculados
  const processedTables = useMemo(() => {
    if (!Array.isArray(tables) || tables.length === 0) {
      return [];
    }
    return tables
      .map((table) => {
        if (!table || typeof table !== "object") {
          return null;
        }
        const state = getTableState(table.events || []);
        const { unseenEventsCount, timer } = getUnseenEvents(
          table.events || []
        );
        return {
          ...table,
          state,
          unseenEventsCount,
          timer,
        };
      })
      .filter(Boolean);
  }, [tables, currentTime]);

  // Función de ordenamiento según los criterios especificados
  const sortTables = (tablesToSort) => {
    return [...tablesToSort].sort((a, b) => {
      // Prioridad de estados
      const statePriority = {
        [TableStates.WAITER]: 1,
        [TableStates.CHECK]: 2,
        [TableStates.OCCUPIED]: 3,
        [TableStates.AVAILABLE]: 4,
      };

      // Obtener el estado actual
      const stateA = a.state;
      const stateB = b.state;

      if (statePriority[stateA] !== statePriority[stateB]) {
        return statePriority[stateA] - statePriority[stateB];
      } else {
        // Mismo estado, aplicar criterios adicionales
        if (stateA === TableStates.WAITER || stateA === TableStates.CHECK) {
          // Mesas con notificaciones sin leer arriba
          if (a.unseenEventsCount !== b.unseenEventsCount) {
            return b.unseenEventsCount - a.unseenEventsCount;
          }
          // Ordenar por tiempo transcurrido
          if (a.timer && b.timer) {
            return new Date(b.timer).getTime() - new Date(a.timer).getTime();
          } else {
            return 0;
          }
        } else {
          // Ordenar por número de mesa
          return a.number - b.number;
        }
      }
    });
  };

  const sortedTables = sortTables(processedTables);

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="admin-screen">
      {company && (
        <>
          <h1>{company.name}</h1>
          <div className="refresh-timer">
            Refrescando en {refreshCountdown} segundos
          </div>
          <table className="tables-list">
            <thead>
              <tr>
                <th>Número</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>No Vistos</th>
                <th>Tiempo Transcurrido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedTables.map((table) => (
                <tr key={table.id}>
                  <td>{table.number}</td>
                  <td>{table.name || "-"}</td>
                  <td>{table.state}</td>
                  <td>
                    {table.unseenEventsCount > 0 ? (
                      <span className="badge">{table.unseenEventsCount}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{table.timer || "-"}</td>
                  <td>
                    {/* Botones de acciones */}
                    <button
                      className="app-button"
                      onClick={() => viewEventHistory(table.id)}
                    >
                      Ver Historial
                    </button>
                    {table.unseenEventsCount > 0 && (
                      <button
                        className="app-button"
                        onClick={() => markEventsAsSeen(table.id)}
                      >
                        Marcar Vistos
                      </button>
                    )}
                    {table.state === TableStates.AVAILABLE ? (
                      <button
                        className="app-button"
                        onClick={() => markAsOccupied(table.id)}
                      >
                        Marcar Ocupada
                      </button>
                    ) : (
                      <button
                        className="app-button"
                        onClick={() => markAsAvailable(table.id)}
                      >
                        Marcar Disponible
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
                  <button
                    className="app-button close-button"
                    onClick={closeEventsModal}
                  >
                    Cerrar
                  </button>
                </div>
                <div className="modal-content">
                  <EventsList events={selectedTableEvents} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminScreen;
