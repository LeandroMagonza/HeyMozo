// src/components/UserScreen.js

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FaUtensils, FaUser, FaFileInvoiceDollar } from 'react-icons/fa';
import ButtonsGroup from './ButtonsGroup';
import EventsList from './EventsList';
import EventModal from './EventModal';
import './UserScreen.css';
import api, { getTable, updateTable } from '../services/api';
import backgroundImage from '../images/background-image.jpg';  // Importa la imagen
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

  // Nuevo estado para el modal
  const [showModal, setShowModal] = useState(false);
  const [modalEventType, setModalEventType] = useState(null);

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

  // Nueva función para manejar la apertura del modal
  const handleOpenModal = (eventType) => {
    setModalEventType(eventType);
    setShowModal(true);
  };

  // Nueva función para manejar el cierre del modal
  const handleCloseModal = () => {
    setShowModal(false);
    setModalEventType(null);
  };

  // Nueva función para manejar el envío del modal
  const handleModalSubmit = (message) => {
    handleEventSubmit(modalEventType, message);
    handleCloseModal();
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
        <h1 className="restaurant-name">{branchName}</h1>

        <div className="buttons-wrapper">
          <ButtonsGroup
            menuLink={menuLink}
            texts={{
              showMenu: <><FaUtensils /> {texts.showMenu}</>,
              callWaiter: <><FaUser /> {texts.callWaiter}</>,
              requestCheck: <><FaFileInvoiceDollar /> {texts.requestCheck}</>
            }}
            onEventSubmit={(eventType) => handleOpenModal(eventType)}
          />
        </div>

        <div className="events-list-wrapper">
          <EventsList events={events} />
        </div>

        <EventModal
          show={showModal}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
          title={modalEventType === EventTypes.CALL_WAITER ? "Llamar al Mesero" : "Solicitar Cuenta"}
          messagePlaceholder="Ingrese un mensaje opcional..."
        />
      </div>
    </div>
  );
};

export default UserScreen;