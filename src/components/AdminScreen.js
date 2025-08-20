import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getCompany, getBranch, getTables, updateTable, markTableEventsSeen, releaseAllTables, markTableAsAvailable, markTableAsOccupied } from '../services/api';
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
import AdminHeader from './AdminHeader';

const AdminScreen = () => {
  const { companyId, branchId } = useParams();
  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [availableEventTypes, setAvailableEventTypes] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const refreshInterval = 6000; // 6 segundos en milisegundos
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

  // Función para cargar tipos de evento disponibles
  const loadEventTypes = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/event-types`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const eventTypes = await response.json();
        setAvailableEventTypes(eventTypes);
        console.log('Admin available event types:', eventTypes);
      } else {
        console.error('Failed to load event types for admin');
        setAvailableEventTypes([]);
      }
    } catch (error) {
      console.error('Error loading admin event types:', error);
      setAvailableEventTypes([]);
    }
  }, [companyId]);

  // Función para obtener los datos
  const fetchData = useCallback(async () => {
    try {
      const companyResponse = await getCompany(companyId);
      setCompany(companyResponse.data);

      const branchResponse = await getBranch(branchId);
      setBranch(branchResponse.data);

      const tablesResponse = await getTables(branchId);
      setTables(tablesResponse.data);
      
      // Extract event types from the first table (they should be the same for all tables in a branch)
      if (tablesResponse.data && tablesResponse.data.length > 0 && tablesResponse.data[0].availableEventTypes) {
        setAvailableEventTypes(tablesResponse.data[0].availableEventTypes);
        console.log('Admin available event types from table data:', tablesResponse.data[0].availableEventTypes);
      } else {
        // Fallback: Load event types separately if not included in table data
        console.log('Fallback: Loading event types separately');
        await loadEventTypes();
      }
      
      console.log('Mesas obtenidas:', tablesResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error.response || error);
      setError(error.message);
      setLoading(false);
    }
  }, [companyId, branchId, loadEventTypes]);

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

  // New simplified function for determining table state and wait time
  const getTableStateAndWaitTime = (events, currentTime, eventTypes = []) => {
    if (!Array.isArray(events) || events.length === 0) {
      return { 
        state: 'AVAILABLE', 
        waitTime: 24 * 60 * 60 * 1000, 
        priority: 0,
        eventType: null,
        color: '#28a745' // Default green for available
      };
    }

    // Sort events from newest to oldest
    const sortedEvents = [...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Find first non-MARK_SEEN event
    let firstRelevantEvent = null;
    for (const event of sortedEvents) {
      // Skip MARK_SEEN events
      const eventType = eventTypes.find(et => 
        (et.id === event.eventTypeId) || 
        (et.systemEventType === 'MARK_SEEN' && (event.type === 'MARK_SEEN' || event.type === EventTypes.MARK_SEEN))
      );
      
      if (!eventType || eventType.systemEventType !== 'MARK_SEEN') {
        firstRelevantEvent = event;
        break;
      }
    }

    if (!firstRelevantEvent) {
      return { 
        state: 'AVAILABLE', 
        waitTime: 24 * 60 * 60 * 1000,
        priority: 0,
        eventType: null,
        color: '#28a745'
      };
    }

    // Find the EventType for this event
    let relevantEventType = eventTypes.find(et => 
      et.id === firstRelevantEvent.eventTypeId ||
      et.systemEventType === 'VACATE' && (firstRelevantEvent.type === 'MARK_AVAILABLE' || firstRelevantEvent.type === EventTypes.MARK_AVAILABLE) ||
      et.systemEventType === 'SCAN' && firstRelevantEvent.type === 'SCAN' ||
      et.systemEventType === 'OCCUPY' && firstRelevantEvent.type === 'OCCUPY' ||
      et.eventName === firstRelevantEvent.type // Legacy fallback
    );

    // If first event is VACATE, table is available
    if (relevantEventType?.systemEventType === 'VACATE' || 
        firstRelevantEvent.type === 'MARK_AVAILABLE' || 
        firstRelevantEvent.type === EventTypes.MARK_AVAILABLE) {
      return {
        state: 'AVAILABLE',
        waitTime: currentTime - new Date(firstRelevantEvent.createdAt),
        priority: 0,
        eventType: relevantEventType,
        color: relevantEventType?.adminColor || '#28a745'
      };
    }

    // Check for unseen custom events (highest priority first)
    const unseenCustomEvents = sortedEvents
      .filter(event => !event.seenAt)
      .map(event => {
        const eventType = eventTypes.find(et => 
          et.id === event.eventTypeId || 
          et.eventName === event.type // Legacy fallback
        );
        return { event, eventType };
      })
      .filter(({ eventType }) => eventType && !eventType.systemEventType) // Only custom events
      .sort((a, b) => (b.eventType?.priority || 0) - (a.eventType?.priority || 0)); // Sort by priority

    if (unseenCustomEvents.length > 0) {
      const highestPriorityEvent = unseenCustomEvents[0];
      return {
        state: highestPriorityEvent.eventType.stateName,
        waitTime: currentTime - new Date(highestPriorityEvent.event.createdAt),
        priority: highestPriorityEvent.eventType.priority,
        eventType: highestPriorityEvent.eventType,
        color: highestPriorityEvent.eventType.adminColor
      };
    }

    // If no unseen custom events, table is occupied (from SCAN/OCCUPY)
    const occupyEvent = sortedEvents.find(event => {
      const eventType = eventTypes.find(et => 
        et.id === event.eventTypeId ||
        et.systemEventType === 'SCAN' && event.type === 'SCAN' ||
        et.systemEventType === 'OCCUPY' && event.type === 'OCCUPY'
      );
      return eventType && (eventType.systemEventType === 'SCAN' || eventType.systemEventType === 'OCCUPY');
    });

    if (occupyEvent) {
      const occupyEventType = eventTypes.find(et => 
        et.id === occupyEvent.eventTypeId ||
        et.systemEventType === 'SCAN' && occupyEvent.type === 'SCAN' ||
        et.systemEventType === 'OCCUPY' && occupyEvent.type === 'OCCUPY'
      );
      
      return {
        state: occupyEventType?.stateName || 'OCCUPIED',
        waitTime: currentTime - new Date(occupyEvent.createdAt),
        priority: occupyEventType?.priority || 80,
        eventType: occupyEventType,
        color: occupyEventType?.adminColor || '#ffc107'
      };
    }

    // Default to available
    return { 
      state: 'AVAILABLE', 
      waitTime: currentTime - new Date(firstRelevantEvent.createdAt),
      priority: 0,
      eventType: null,
      color: '#28a745'
    };
  };

  // Función para contar eventos no vistos (excluding system events which are auto-seen)
  const countUnseenEvents = (events, eventTypes = []) => {
    // Verificar que events existe y es un array
    if (!Array.isArray(events)) {
      return {
        hasUnseenWithMessage: false,
        totalUnseen: 0
      };
    }

    let useenEventCount = 0;
    let hasUnseenWithMessage = false;
    
    for (const event of events) {
      if (event.seenAt != null) { break; } 
      
      // Find the event type to check if it's a system event
      const eventType = eventTypes.find(et => 
        et.id === event.eventTypeId ||
        et.eventName === event.type || // Legacy fallback
        et.systemEventType === 'MARK_SEEN' && (event.type === 'MARK_SEEN' || event.type === EventTypes.MARK_SEEN)
      );
      
      // Only count custom events (not system events) or legacy events
      if (!eventType?.systemEventType || 
          event.type === EventTypes.CALL_WAITER || 
          event.type === EventTypes.REQUEST_CHECK || 
          event.type === EventTypes.CALL_MANAGER) {
        useenEventCount++;
        if (event.message) { hasUnseenWithMessage = true;}
      }
    }
    if (useenEventCount > 0) {
      console.log('Eventos no vistos:', useenEventCount);
    }
    return {
      hasUnseenWithMessage,
      totalUnseen: useenEventCount
    };
  };

  // Procesar las mesas
  const processedTables = useMemo(() => {
    //console.log('Procesando mesas:', tables);
    const currentTime = new Date();

    return tables.map(table => {
      // Use table-specific event types if available, otherwise fall back to global ones
      const tableEventTypes = table.availableEventTypes || availableEventTypes;
      const { state, waitTime, priority, eventType, color } = getTableStateAndWaitTime(table.events, currentTime, tableEventTypes);
      const unseenEvents = countUnseenEvents(table.events, tableEventTypes);
      const canMarkSeenFromOutside = unseenEvents.hasUnseenWithMessage && unseenEvents.totalUnseen > 0;

      return {
        ...table,
        currentState: state,
        unseenCount: unseenEvents.totalUnseen,
        canMarkSeenFromOutside,
        waitingTime: waitTime,
        priority: priority,
        eventType: eventType,
        stateColor: color
      };
    });
  }, [tables, availableEventTypes]);

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
        // Use dynamic priority from EventType or fallback to hardcoded values
        const aPriority = a.priority !== undefined ? a.priority : getHardcodedPriority(a.currentState);
        const bPriority = b.priority !== undefined ? b.priority : getHardcodedPriority(b.currentState);
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        return b.waitingTime - a.waitingTime; // Longer wait time first for same priority
      } else {
        // Ordenar por nombre de mesa usando ordenamiento natural
        return naturalSort(a.tableName || '', b.tableName || '');
      }
    });
  }, [processedTables, sortType]);

  // Helper function for backward compatibility with hardcoded priorities
  const getHardcodedPriority = (state) => {
    const stateOrder = {
      [TableStates.MANAGER_WAITER_CHECK]: 100,
      [TableStates.MANAGER_WAITER]: 90,
      [TableStates.MANAGER_CHECK]: 85,
      [TableStates.MANAGER]: 80,
      [TableStates.WAITER_AND_CHECK]: 70,
      [TableStates.WAITER]: 60,
      [TableStates.CHECK]: 50,
      [TableStates.OCCUPIED]: 10,
      [TableStates.AVAILABLE]: 0
    };
    return stateOrder[state] || 0;
  };

  // Función para ver el historial de eventos
  const viewEventHistory = (tableId) => {
    const table = sortedTables.find((t) => t.id === tableId);
    if (!table) return;
    //console.log('Mesa seleccionada:', table);
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
    try {
      await markTableAsAvailable(tableId);
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
    try {
      await markTableAsOccupied(tableId);
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
      <AdminHeader 
        title={loading ? 'Cargando...' : error ? 'Error' : `${company?.name} - ${branch?.name}`}
        showBackButton={true}
        backUrl={`/admin/${companyId}/${branchId}/config`}
      />
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
        eventTypes={selectedTable?.availableEventTypes || availableEventTypes}
      />
    </div>
  );
};

export default AdminScreen;
