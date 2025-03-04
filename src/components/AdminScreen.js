import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getCompany, getBranch, getTables, updateTable, markTableEventsSeen, releaseAllTables } from '../services/api';
import './AdminScreen.css';
import './AdminModal.css';
import EventsList from './EventsList';
import { TableStates, TableColors } from '../theme';
import { FaHistory, FaCheckCircle, FaSignOutAlt, FaSignInAlt, FaUser, FaFileInvoiceDollar, FaTimes, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { translateState, translateEvent } from '../utils/translations';
import { EventTypes } from '../constants';
import AdminHistoryModal from './AdminHistoryModal';
import notificationSound from '../sounds/notification.mp3';
import TablesList from './TablesList';
import SoundToggleButton from './SoundToggleButton';

const AdminScreen = () => {
  const { companyId, branchId } = useParams();
  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const refreshInterval = 15000; // 15 segundos en milisegundos
  const [refreshCountdown, setRefreshCountdown] = useState(refreshInterval / 1000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [sortType, setSortType] = useState('priority'); // Nuevo estado para el tipo de ordenamiento
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const TableStates = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    WAITER: 'WAITER',
    CHECK: 'CHECK',
    WAITER_AND_CHECK: 'WAITER_AND_CHECK',
    MANAGER: 'MANAGER',
    MANAGER_WAITER: 'MANAGER_WAITER',
    MANAGER_CHECK: 'MANAGER_CHECK',
    MANAGER_WAITER_CHECK: 'MANAGER_WAITER_CHECK'
  };

  const audioRef = useRef(new Audio(notificationSound));
  const previousUnseenCountRef = useRef(0);

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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error.response || error);
      setError(error.message);
      setLoading(false);
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

  // Efecto para actualizar el tiempo actual
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Función para convertir milisegundos a minutos
  const msToMinutes = (duration) => {
    return Math.floor(duration / (1000 * 60));
  };

  // Función para determinar el estado y tiempo de espera de una mesa
  const getTableStateAndWaitTime = (events, currentTime) => {
    if (!events || events.length === 0) return { state: TableStates.AVAILABLE, waitTime: 0 };

    let state = TableStates.AVAILABLE;
    let waitTime = 0;
    let lastOccupiedTime = null;
    let hasUnseenWaiter = false;
    let hasUnseenCheck = false;
    let hasUnseenManager = false;
    let lastAvailableIndex = -1;

    // Ordenar eventos por fecha, más antiguo primero
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );

    // Encontrar el último evento MARK_AVAILABLE
    lastAvailableIndex = sortedEvents.findLastIndex(event => event.type === EventTypes.MARK_AVAILABLE);

    // Si no hay MARK_AVAILABLE o hay eventos después de él, la mesa está ocupada
    const eventsAfterLastAvailable = lastAvailableIndex === -1 ? 
      sortedEvents : 
      sortedEvents.slice(lastAvailableIndex + 1);

    if (lastAvailableIndex === -1 || eventsAfterLastAvailable.length > 0) {
      state = TableStates.OCCUPIED;
      // Usar el primer evento como tiempo de ocupación si no hay MARK_AVAILABLE
      lastOccupiedTime = lastAvailableIndex === -1 ? 
        new Date(sortedEvents[0].createdAt) : 
        new Date(sortedEvents[lastAvailableIndex + 1].createdAt);
    }

    // Procesar eventos después del último MARK_AVAILABLE
    for (const event of eventsAfterLastAvailable) {
      const eventTime = new Date(event.createdAt);

      switch (event.type) {
        case EventTypes.CALL_WAITER:
          if (!event.seenAt) {
            hasUnseenWaiter = true;
          }
          break;

        case EventTypes.REQUEST_CHECK:
          if (!event.seenAt) {
            hasUnseenCheck = true;
          }
          break;

        case EventTypes.CALL_MANAGER:
          if (!event.seenAt) {
            hasUnseenManager = true;
          }
          break;

        case EventTypes.MARK_SEEN:
          // Solo resetear los estados si el MARK_SEEN es después del último evento de cada tipo
          const lastWaiterCall = eventsAfterLastAvailable.findLast(e => e.type === EventTypes.CALL_WAITER);
          const lastCheckRequest = eventsAfterLastAvailable.findLast(e => e.type === EventTypes.REQUEST_CHECK);
          const lastManagerCall = eventsAfterLastAvailable.findLast(e => e.type === EventTypes.CALL_MANAGER);

          if (!lastWaiterCall || eventTime > new Date(lastWaiterCall.createdAt)) hasUnseenWaiter = false;
          if (!lastCheckRequest || eventTime > new Date(lastCheckRequest.createdAt)) hasUnseenCheck = false;
          if (!lastManagerCall || eventTime > new Date(lastManagerCall.createdAt)) hasUnseenManager = false;
          break;
      }
    }

    // Determinar estado final
    if (state !== TableStates.AVAILABLE) {
      if (hasUnseenManager) {
        if (hasUnseenWaiter && hasUnseenCheck) {
          state = TableStates.MANAGER_WAITER_CHECK;
        } else if (hasUnseenWaiter) {
          state = TableStates.MANAGER_WAITER;
        } else if (hasUnseenCheck) {
          state = TableStates.MANAGER_CHECK;
        } else {
          state = TableStates.MANAGER;
        }
      } else if (hasUnseenWaiter && hasUnseenCheck) {
        state = TableStates.WAITER_AND_CHECK;
      } else if (hasUnseenWaiter) {
        state = TableStates.WAITER;
      } else if (hasUnseenCheck) {
        state = TableStates.CHECK;
      }
    }

    // Calcular tiempo de espera
    if (state === TableStates.AVAILABLE) {
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      waitTime = currentTime - new Date(lastEvent.createdAt);
    } else if (lastOccupiedTime) {
      waitTime = currentTime - lastOccupiedTime;
    }

    return { state, waitTime };
  };

  // Función para contar eventos no vistos
  const countUnseenEvents = (events) => {
    // Verificar que events existe y es un array
    if (!Array.isArray(events)) {
      return {
        countWithMessage: 0,
        hasUnseenWithoutMessage: false,
        hasUnseenWithMessage: false,
        totalUnseen: 0
      };
    }

    let countWithMessage = 0;
    let hasUnseenWithoutMessage = false;
    let hasUnseenWithMessage = false;
    let lastSeenOrAvailableTime = null;

    // Ordenar eventos por fecha, más reciente primero
    const sortedEvents = [...events].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    for (const event of sortedEvents) {
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
      countWithMessage,
      hasUnseenWithoutMessage,
      hasUnseenWithMessage,
      totalUnseen: countWithMessage + (hasUnseenWithoutMessage ? 1 : 0)
    };
  };

  // Procesar las mesas
  const processedTables = useMemo(() => {
    console.log('Procesando mesas:', tables);
    const currentTime = new Date();

    return tables.map(table => {
      const { state, waitTime } = getTableStateAndWaitTime(table.events, currentTime);
      const unseenEvents = countUnseenEvents(table.events);
      const canMarkSeenFromOutside = unseenEvents.hasUnseenWithoutMessage && !unseenEvents.hasUnseenWithMessage;

      return {
        ...table,
        currentState: state,
        unseenCount: unseenEvents.countWithMessage,
        canMarkSeenFromOutside,
        waitingTime: waitTime,
      };
    });
  }, [tables]);

  // Nueva función para manejar el cambio de ordenamiento
  const handleSortChange = (event) => {
    setSortType(event.target.value);
  };

  // Función auxiliar para ordenamiento natural de strings con números
  const naturalSort = (a, b) => {
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base'
    });
    return collator.compare(a, b);
  };

  // Modificar la lógica de ordenamiento en sortedTables
  const sortedTables = useMemo(() => {
    return [...processedTables].sort((a, b) => {
      if (sortType === 'priority') {
        if (a.currentState !== b.currentState) {
          const stateOrder = {
            [TableStates.MANAGER_WAITER_CHECK]: 0,
            [TableStates.MANAGER_WAITER]: 1,
            [TableStates.MANAGER_CHECK]: 2,
            [TableStates.MANAGER]: 3,
            [TableStates.WAITER_AND_CHECK]: 4,
            [TableStates.WAITER]: 5,
            [TableStates.CHECK]: 6,
            [TableStates.OCCUPIED]: 7,
            [TableStates.AVAILABLE]: 8
          };
          return stateOrder[a.currentState] - stateOrder[b.currentState];
        }
        return b.waitingTime - a.waitingTime;
      } else {
        // Ordenar por nombre de mesa usando ordenamiento natural
        return naturalSort(a.tableName || '', b.tableName || '');
      }
    });
  }, [processedTables, sortType]);

  // Función para ver el historial de eventos
  const viewEventHistory = (tableId) => {
    const table = sortedTables.find((t) => t.id === tableId);
    if (!table) return;

    setSelectedTable(table);
    setShowEventsModal(true);
  };

  // Función para cerrar el modal de eventos
  const closeEventsModal = () => {
    setShowEventsModal(false);
  };

  // Función para marcar eventos como vistos
  const markEventsAsSeen = async (tableId) => {
    try {
      const response = await markTableEventsSeen(tableId);
      
      if (response.data && typeof response.data === 'object') {
        // Actualizar la tabla en el estado local
        setTables(prevTables => 
          prevTables.map(table => 
            table.id === tableId ? response.data : table
          )
        );
        
        // Actualizar la tabla seleccionada si es la que estamos viendo
        if (selectedTable?.id === tableId) {
          setSelectedTable(response.data);
        }
      }
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
      
      // Actualizar la mesa seleccionada si está abierta en el modal
      if (selectedTable?.id === tableId) {
        const updatedSelectedTable = processedTables.find(t => t.id === tableId);
        if (updatedSelectedTable) {
          setSelectedTable({
            ...updatedSelectedTable,
            currentState: 'AVAILABLE'
          });
        }
      }
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
      
      // Actualizar la mesa seleccionada si está abierta en el modal
      if (selectedTable?.id === tableId) {
        const updatedSelectedTable = processedTables.find(t => t.id === tableId);
        if (updatedSelectedTable) {
          setSelectedTable({
            ...updatedSelectedTable,
            currentState: 'OCCUPIED'
          });
        }
      }
    } catch (error) {
      console.error('Error al marcar la mesa como ocupada:', error);
    }
  };

  const handleReleaseAllTables = async () => {
    const confirmed = window.confirm(
      '¿Está seguro que desea liberar todas las mesas?\n' +
      'Esta acción marcará todas las mesas como disponibles y todos los eventos como vistos.'
    );

    if (confirmed) {
      try {
        const response = await releaseAllTables(branchId);
        setTables(response.data);
      } catch (error) {
        console.error('Error liberando todas las mesas:', error);
      }
    }
  };

  // Función para verificar si hay mensajes sin leer
  const totalUnseenMessages = useMemo(() => {
    return processedTables.reduce((total, table) => total + (table.unseenCount || 0), 0);
  }, [processedTables]);

  // Efecto para reproducir el sonido cuando hay nuevos mensajes
  useEffect(() => {
    if (isSoundEnabled && totalUnseenMessages > previousUnseenCountRef.current) {
      audioRef.current.play().catch(error => {
        console.log('Audio playback was prevented:', error);
      });
    }
    previousUnseenCountRef.current = totalUnseenMessages;
  }, [totalUnseenMessages, isSoundEnabled]);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!company) return <div>No se encontró la compañía</div>;

  return (
    <div className="admin-screen">
      <div className="branch-info">
        {loading ? (
          <p>Cargando...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <h1>{company?.name}</h1>
            <h2>{branch?.name}</h2>
          </>
        )}
      </div>
      <div className="refresh-timer">
        Refrescando en {refreshCountdown} segundos
      </div>
      <div className="controls-row">
        <div className="sort-selector">
          <label htmlFor="sort-type">Ordenar por: </label>
          <select id="sort-type" value={sortType} onChange={handleSortChange}>
            <option value="priority">Prioridad de atención</option>
            <option value="tableNumber">Nombre de mesa</option>
          </select>
        </div>
        <div className="controls-right">
          <SoundToggleButton 
            isSoundEnabled={isSoundEnabled}
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
          />
          <button 
            className="release-all-button app-button"
            onClick={handleReleaseAllTables}
          >
            <FaSignOutAlt /> Liberar TODAS las Mesas
          </button>
        </div>
      </div>

      <TablesList 
        tables={sortedTables}
        onTableClick={(table) => viewEventHistory(table.id)}
        msToMinutes={msToMinutes}
        onMarkAsAvailable={markAsAvailable}
        onMarkAsOccupied={markAsOccupied}
      />

      <AdminHistoryModal
        show={showEventsModal}
        onClose={closeEventsModal}
        selectedTable={selectedTable}
        onMarkSeen={markEventsAsSeen}
        onMarkAsAvailable={markAsAvailable}
        onMarkAsOccupied={markAsOccupied}
      />
    </div>
  );
};

export default AdminScreen;
