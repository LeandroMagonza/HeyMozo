import React from 'react';
import EventsList from './EventsList';
import { FaCheckCircle, FaTimes, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';
import './AdminModal.css';

const AdminHistoryModal = ({ 
  show, 
  onClose, 
  selectedTable, 
  onMarkSeen,
  onMarkAsAvailable,
  onMarkAsOccupied 
}) => {
  if (!show) return null;

  const isAvailable = selectedTable?.currentState === 'AVAILABLE';

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <h2>Historial de Eventos</h2>
            <h3>{selectedTable.tableName}</h3>
          </div>
          <button className="app-button close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-content">
          <div className="modal-actions">
            <div className="action-buttons-row">
              <button 
                className="app-button" 
                onClick={() => onMarkSeen(selectedTable.id)}
                disabled={selectedTable.events[0]?.seenAt !== null}
              >
                
                <FaCheckCircle /> Marcar Vistos
              </button>
              {isAvailable ? (
                <button 
                  className="app-button occupy-button" 
                  onClick={() => onMarkAsOccupied(selectedTable.id)}
                >
                  <FaSignInAlt /> Ocupar
                </button>
              ) : (
                <button 
                  className="app-button release-button" 
                  onClick={() => onMarkAsAvailable(selectedTable.id)}
                >
                  <FaSignOutAlt /> Liberar
                </button>
              )}
            </div>
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