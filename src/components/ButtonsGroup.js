// src/components/ButtonsGroup.js

import React, { useState } from 'react';
import EventModal from './EventModal';
import './ButtonsGroup.css';
const { EventTypes } = require('../constants');

const ButtonsGroup = ({ menuLink, texts, onEventSubmit }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    eventType: '',
    messagePlaceholder: '',
  });

  const handleOpenModal = (type) => {
    if (type === 'CALL_WAITER') {
      setModalConfig({
        title: texts.callWaiter,
        eventType: EventTypes.CALL_WAITER, // Usamos EventTypes
        messagePlaceholder: 'Escribe un mensaje (opcional)',
      });
    } else if (type === 'REQUEST_CHECK') {
      setModalConfig({
        title: texts.requestCheck,
        eventType: EventTypes.REQUEST_CHECK, // Usamos EventTypes
        messagePlaceholder: 'Escribe un mensaje (opcional)',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmitModal = (message) => {
    onEventSubmit(modalConfig.eventType, message);
    setShowModal(false);
  };

  return (
    <div className="buttons-container">
      {menuLink && (
        <button
          className="app-button"
          onClick={() => window.open(menuLink, '_blank')}
        >
          {texts.showMenu}
        </button>
      )}
      <button
        className="app-button"
        onClick={() => handleOpenModal('CALL_WAITER')}
      >
        {texts.callWaiter}
      </button>
      <button
        className="app-button"
        onClick={() => handleOpenModal('REQUEST_CHECK')}
      >
        {texts.requestCheck}
      </button>

      <EventModal
        show={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitModal}
        title={modalConfig.title}
        messagePlaceholder={modalConfig.messagePlaceholder}
      />
    </div>
  );
};

export default ButtonsGroup;
