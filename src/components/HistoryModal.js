import React from 'react';
import EventsList from './EventsList';
import './HistoryModal.css';
import { FaTimes } from 'react-icons/fa';

const HistoryModal = ({ show, onClose, events, eventTypes = [] }) => {
  if (!show) return null;

  return (
    <div className="history-modal-overlay">
      <div className="history-modal">
        <div className="history-modal-header">
          <h2>Histórico de Eventos</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="history-modal-content">
          <EventsList events={events} showSeenStatus={false} eventTypes={eventTypes} isAdminView={false} />
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;