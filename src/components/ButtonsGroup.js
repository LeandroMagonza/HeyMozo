// src/components/ButtonsGroup.js

import React from 'react';
import './ButtonsGroup.css';
const { EventTypes } = require('../constants');

const ButtonsGroup = ({ menuLink, texts, onEventSubmit }) => {
  return (
    <div className="buttons-group">
      { menuLink && (
        <div className="button-container">
          <button className="user-button" onClick={() => window.open(menuLink, '_blank')}>
            {texts.showMenu}
          </button>
        </div>
      )}
      <div className="button-container">
        <button className="user-button" onClick={() => onEventSubmit(EventTypes.CALL_WAITER)}>
          {texts.callWaiter}
        </button>
      </div>
      <div className="button-container">
        <button className="user-button" onClick={() => onEventSubmit(EventTypes.REQUEST_CHECK)}>
          {texts.requestCheck}
        </button>
      </div>
    </div>
  );
};

export default ButtonsGroup;
