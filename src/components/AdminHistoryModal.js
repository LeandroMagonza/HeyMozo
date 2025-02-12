import React from 'react';
import EventsList from './EventsList';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import './AdminModal.css';

const AdminHistoryModal = ({ 
  show, 
  onClose, 
  selectedTable, 
  onMarkSeen 
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Historial de Eventos - {selectedTable.tableName}</h2>
          <button className="app-button close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-content">
          <div className="modal-actions">
            <button 
              className="app-button" 
              onClick={() => onMarkSeen(selectedTable.id)}
              disabled={selectedTable.events[selectedTable.events.length-1].seenAt !== null}
            >
              <FaCheckCircle /> Marcar Vistos
            </button>
          </div>
          <div className="events-list-container">
            <EventsList events={selectedTable.events} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHistoryModal; 