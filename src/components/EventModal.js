// src/components/EventModal.js

import React, { useState } from 'react';
import './EventModal.css';
import { EventTypes } from '../constants';

const EventModal = ({ show, onClose, onSubmit, title, messagePlaceholder, eventType }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    onSubmit(message);
    setMessage('');
  };

  if (!show) return null;

  const modalStyle = eventType === EventTypes.CALL_MANAGER 
    ? { backgroundColor: '#ffebee' } // Light red background for manager calls
    : {};

  return (
    <div className="modal-overlay">
      <div className="modal" style={modalStyle}>
        <h2>{title}</h2>
        <textarea
          placeholder={messagePlaceholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        ></textarea>
        <div className="modal-buttons">
          <button className="app-button" onClick={handleSubmit}>Enviar</button>
          <button className="app-button" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
