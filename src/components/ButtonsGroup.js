// src/components/ButtonsGroup.js

import React from 'react';
import './ButtonsGroup.css';

const ButtonsGroup = ({ menuLink, texts, onEventSubmit, onShowEvents }) => {
  const handleMenuClick = () => {
    window.open(menuLink, '_blank');
  };

  return (
    <div className="buttons-group">
      <div className="button-container">
        <button className="user-button" onClick={handleMenuClick}>
          {texts.showMenu}
        </button>
      </div>
      <div className="button-container">
        <button className="user-button" onClick={() => onEventSubmit('CALL_WAITER')}>
          {texts.callWaiter}
        </button>
      </div>
      <div className="button-container">
        <button className="user-button" onClick={() => onEventSubmit('REQUEST_CHECK')}>
          {texts.requestCheck}
        </button>
      </div>
      <div className="button-container">
        <button className="user-button" onClick={onShowEvents}>
          {texts.showEvents}
        </button>
      </div>
      <div className="button-container">
        <button 
          className="user-button manager-button" 
          onClick={() => onEventSubmit('CALL_MANAGER')}
        >
          {texts.callManager}
        </button>
      </div>
    </div>
  );
};

export default ButtonsGroup;
