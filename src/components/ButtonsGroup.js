// src/components/ButtonsGroup.js

import React from 'react';
import './ButtonsGroup.css';
import IconRenderer from '../services/iconRenderer';

const ButtonsGroup = ({ 
  menuLink, 
  texts, 
  onEventSubmit, 
  onShowEvents,
  showMenuButton = true, // Valor por defecto true para mantener compatibilidad
  availableEvents = [] // Dynamic events from API
}) => {
  const handleMenuClick = () => {
    window.open(menuLink, '_blank');
  };

  // Function to render dynamic event buttons - NO FALLBACKS
  const renderEventButtons = () => {
    if (availableEvents && availableEvents.length > 0) {
      // Use dynamic events from API
      return availableEvents.map((eventType) => (
        <div key={eventType.id} className="button-container">
          <button 
            className="user-button dynamic-event-button" 
            style={{ 
              '--event-color': eventType.userColor,
              '--event-font-color': eventType.userFontColor || '#ffffff'
            }}
            onClick={() => onEventSubmit(eventType)}
          >
            {eventType.userIcon && (
              <IconRenderer 
                iconName={eventType.userIcon} 
                className="button-icon" 
                size="1.2em"
              />
            )}
            <span className="button-text">{eventType.eventName}</span>
          </button>
        </div>
      ));
    } else {
      // NO FALLBACK BUTTONS - Show nothing if no events are loaded
      return null;
    }
  };

  return (
    <div className="buttons-group">
      {showMenuButton && menuLink && (
        <div className="button-container">
          <button 
            className="user-button menu-button" 
            onClick={handleMenuClick}
          >
            {texts.showMenu}
          </button>
        </div>
      )}
      
      {renderEventButtons()}
      
      <div className="button-container">
        <button className="user-button history-button" onClick={onShowEvents}>
          {texts.showEvents}
        </button>
      </div>
    </div>
  );
};

export default ButtonsGroup;
