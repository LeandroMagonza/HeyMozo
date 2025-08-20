import React from 'react';
import { FaHistory, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';
import { translateState } from '../utils/translations';
import { TableColors } from '../theme';
import './TablesList.css';

const TablesList = ({ 
  tables, 
  onTableClick, 
  msToMinutes,
  onMarkAsAvailable,
  onMarkAsOccupied
}) => {
  const getLastMessage = (table) => {
    if (!table.events || table.events.length === 0) return '';
    
    // Encontrar el último evento con mensaje
    const lastEventWithMessage = [...table.events]
      .reverse()
      .find(event => event.message);
    
    return lastEventWithMessage?.message || ''; // Si no hay mensaje, retorna vacío
  };

  return (
    <div className="tables-list-component">
      {/* Vista de escritorio con scroll */}
      <div className="desktop-view tables-list">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Tiempo de espera</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.id} style={{ backgroundColor: table.stateColor || TableColors[table.currentState] }}>
                <td>{table.tableName || '-'}</td>
                <td>{table.eventType?.stateName || translateState(table.currentState)}</td>
                <td>{msToMinutes(table.waitingTime)} min</td>
                <td>
                  <div className="table-actions">
                    <button className="app-button" onClick={() => onTableClick(table)}>
                      <FaHistory />
                      <span>Historial</span>
                      {table.unseenCount > 0 && 
                        <span className="unseen-count">{table.unseenCount}</span>
                      }
                    </button>
                    {table.currentState === 'AVAILABLE' ? (
                      <button 
                        className="app-button occupy-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsOccupied(table.id);
                        }}
                      >
                        <FaSignInAlt /> Ocupar
                      </button>
                    ) : (
                      <button 
                        className="app-button release-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsAvailable(table.id);
                        }}
                      >
                        <FaSignOutAlt /> Liberar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista móvil con scroll */}
      <div className="mobile-view">
        {tables.map((table) => (
          <div
            key={table.id}
            className="chat-like-item"
            style={{ backgroundColor: table.stateColor || TableColors[table.currentState] }}
            onClick={() => onTableClick(table)}
          >
            <div className="chat-header">
              <span className="table-name">
                {table.tableName || '-'} - {table.eventType?.stateName || translateState(table.currentState)}
              </span>
              <span className="waiting-time">{msToMinutes(table.waitingTime)} min</span>
            </div>
            <div className="chat-content">
              <span className="last-message">{getLastMessage(table)}</span>
              {table.unseenCount > 0 && (
                <span className="mobile-unseen-count">{table.unseenCount}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TablesList; 