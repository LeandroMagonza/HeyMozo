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
        const [companyData, branchData, tableData] = await Promise.all([
          getCompany(companyId),
          getBranch(branchId),
          getTable(tableId)
        ]);

        setCompany(companyData.data);
        setBranch(branchData.data);
        setTable(tableData.data);

        // Crear evento de escaneo local (sin seenAt)
        const scanEvent = {
          type: EventTypes.SCAN,
          message: null,
          createdAt: new Date().toISOString(),
          seenAt: null  // Explícitamente null
        };

        try {
          const response = await sendEvent(tableId, scanEvent);
          // Solo mantener los eventos locales
          setEvents([scanEvent]);
        } catch (error) {
          console.error('Error sending scan event:', error);
        }

        setMenuLink(branchData.data.menu || companyData.data.menu);
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
      const newEvent = {
        type: modalEventType,
        message: message || null,
        createdAt: new Date().toISOString(),
        seenAt: null  // Explícitamente null
      };

      const response = await sendEvent(tableId, newEvent);
      
      // Agregar el nuevo evento a la lista local
      setEvents(prevEvents => [...prevEvents, newEvent]);
      handleCloseModal();
    } catch (error) {
      console.error('Error sending event:', error);
    }
  };

  const handleDirectEvent = async (eventType) => {
    try {
      const response = await sendEvent(tableId, {
        type: eventType,
        message: null
      });

      setTable(response.data);
      setEvents(response.data.events || []);
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

  return (
    <div className="user-screen" style={backgroundStyle}>
      <div className="content-wrapper">
        <h1 className="restaurant-name">{branch?.name || 'Cargando...'}</h1>

        <div className="buttons-wrapper">
          <ButtonsGroup
            menuLink={menuLink}
            texts={{
              showMenu: <><FaUtensils /> {texts.showMenu}</>,
              callWaiter: <><FaUser /> {texts.callWaiter}</>,
              requestCheck: <><FaFileInvoiceDollar /> {texts.requestCheck}</>,
              showEvents: <><FaHistory /> Histórico</>
            }}
            onEventSubmit={(eventType) => handleOpenModal(eventType)}
            onShowEvents={handleOpenEventsModal}
          />
        </div>

        <EventModal
          show={showModal}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
          title={modalEventType === EventTypes.CALL_WAITER ? "Llamar al Mesero" : "Solicitar Cuenta"}
          messagePlaceholder="Ingrese un mensaje opcional..."
        />

        <HistoryModal
          show={showEventsModal}
          onClose={handleCloseEventsModal}
          events={events}
        />
      </div>
    </div>
  );
};

export default UserScreen;
