// src/components/UserScreen.js

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FaUtensils, FaUser, FaFileInvoiceDollar, FaHistory } from 'react-icons/fa';
import ButtonsGroup from './ButtonsGroup';
import EventModal from './EventModal';
import HistoryModal from './HistoryModal';
import './UserScreen.css';
import { getCompany, getBranch, getTable, sendEvent } from '../services/api';
import backgroundImage from '../images/background-image.jpg';  // Importa la imagen
import { EventTypes } from '../constants';

const UserScreen = () => {
  const { companyId, branchId, tableId } = useParams();
  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [table, setTable] = useState(null);
  const [events, setEvents] = useState([]);
  const [availableEventTypes, setAvailableEventTypes] = useState([]);
  const [menuLink, setMenuLink] = useState('');
  const [texts, setTexts] = useState({
    showMenu: 'Mostrar Menú',
    callWaiter: 'Llamar al Mesero',
    requestCheck: 'Solicitar Cuenta',
  });
  const pageLoadTime = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [modalEventType, setModalEventType] = useState(null);
  const [showEventsModal, setShowEventsModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load basic data first
        const [companyData, branchData, tableData] = await Promise.all([
          getCompany(companyId),
          getBranch(branchId),
          getTable(tableId)
        ]);

        console.log('Table data received:', tableData.data);

        setCompany(companyData.data);
        setBranch(branchData.data);
        setTable(tableData.data);

        // Get available event types from table response
        const availableEvents = tableData.data.availableEventTypes || [];
        setAvailableEventTypes(availableEvents);
        console.log('Available event types:', availableEvents);

        // Set events from table response
        if (tableData.data.events) {
          setEvents(tableData.data.events);
        }

        // Send SCAN event automatically (customers scan QR to access page)
        try {
          const scanEvent = {
            systemEventType: 'SCAN',
            message: null
          };

          const scanResponse = await sendEvent(tableId, scanEvent);
          console.log('Scan event sent successfully');
          
          if (scanResponse.data && scanResponse.data.events) {
            setEvents(scanResponse.data.events);
          }
        } catch (error) {
          console.error('Error sending scan event:', error);
        }

        // Solo establecer el menuLink si existe una URL en la sucursal o compañía
        const branchMenu = branchData.data.menu;
        const companyMenu = companyData.data.menu;
        if (branchMenu || companyMenu) {
          setMenuLink(branchMenu || companyMenu);
        } else {
          setMenuLink(''); // Asegurarnos que sea vacío si no hay menú
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [companyId, branchId, tableId]);

  const handleOpenModal = (eventType) => {
    setModalEventType(eventType);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalEventType(null);
  };

  const handleModalSubmit = async (message) => {
    try {
      // modalEventType is now the full event type object
      const eventType = modalEventType && modalEventType.id 
        ? modalEventType 
        : availableEventTypes.find(et => et.id === modalEventType || et.eventName === modalEventType);
      
      const newEvent = eventType ? {
        eventTypeId: eventType.id,
        message: message || null
      } : {
        type: modalEventType,
        message: message || null
      };

      const response = await sendEvent(tableId, newEvent);
      console.log('Event response:', response.data);
      
      // Update events from server response
      if (response.data && response.data.events) {
        setEvents(response.data.events);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error sending event:', error);
    }
  };

  const handleDirectEvent = async (eventType) => {
    try {
      // Find the event type object from available events or use legacy format
      const eventTypeObj = availableEventTypes.find(et => et.id === eventType || et.eventName === eventType);
      
      const eventData = eventTypeObj ? {
        eventTypeId: eventTypeObj.id,
        message: null
      } : {
        type: eventType,
        message: null
      };

      const response = await sendEvent(tableId, eventData);

      console.log('Direct event response:', response.data);
      if (response.data) {
        setTable(response.data);
        setEvents(response.data.events || []);
      }
    } catch (error) {
      console.error('Error sending event:', error);
    }
  };

  const handleOpenEventsModal = () => {
    setShowEventsModal(true);
  };

  const handleCloseEventsModal = () => {
    setShowEventsModal(false);
  };

  const backgroundStyle = {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  console.log('Current table state:', table); // Debug log

  return (
    <div className="user-screen" style={backgroundStyle}>
      <div className="content-wrapper">
        <div className="location-info">
          <h1 className="company-name">{company?.name || 'Cargando...'}</h1>
          <h2 className="branch-name">{branch?.name || ''}</h2>
          <h3 className="table-name">{table?.tableName || ''}</h3>
        </div>

        <div className="buttons-wrapper">
          <ButtonsGroup
            menuLink={menuLink}
            texts={{
              showMenu: <><FaUtensils /> {texts.showMenu}</>,
              callWaiter: <><FaUser /> {texts.callWaiter}</>,
              requestCheck: <><FaFileInvoiceDollar /> {texts.requestCheck}</>,
              showEvents: <><FaHistory /> Histórico</>,
              callManager: <><FaUser /> Llamar Encargado</>
            }}
            onEventSubmit={(eventType) => handleOpenModal(eventType)}
            onShowEvents={handleOpenEventsModal}
            showMenuButton={!!menuLink}
            availableEvents={availableEventTypes}
          />
        </div>

        {/* Nuevo footer */}
        <div className="heymozo-footer">
          <img src="/images/heymozo-logo.png" alt="HeyMozo Logo" />
          <span>Generado por HeyMozo</span>
        </div>

        <EventModal
          show={showModal}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
          title={
            modalEventType && modalEventType.eventName 
              ? modalEventType.eventName
              : modalEventType === EventTypes.CALL_WAITER 
                ? "Llamar al Mesero" 
                : modalEventType === EventTypes.REQUEST_CHECK 
                  ? "Solicitar Cuenta"
                  : "Llamar al Encargado"
          }
          messagePlaceholder="Ingrese un mensaje opcional..."
          eventType={modalEventType}
        />

        <HistoryModal
          show={showEventsModal}
          onClose={handleCloseEventsModal}
          events={events}
          eventTypes={availableEventTypes}
        />
      </div>
    </div>
  );
};

export default UserScreen;
