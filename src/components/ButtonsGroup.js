// src/components/ButtonsGroup.js

import React, { useState } from "react";
import "./ButtonsGroup.css";
const { EventTypes } = require("../constants");

const ButtonsGroup = ({ menuLink, texts, onEventSubmit }) => {
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState("");
  const [currentEventType, setCurrentEventType] = useState(null);

  const handleEventClick = (eventType) => {
    setCurrentEventType(eventType);
    setShowMessageInput(true);
  };

  const handleSubmit = () => {
    onEventSubmit(currentEventType, message);
    setShowMessageInput(false);
    setMessage("");
  };

  return (
    <div className="buttons-group">
      {menuLink && (
        <a
          href={menuLink}
          target="_blank"
          rel="noopener noreferrer"
          className="app-button"
        >
          {texts.showMenu}
        </a>
      )}
      <button
        className="app-button"
        onClick={() => handleEventClick(EventTypes.CALL_WAITER)}
      >
        {texts.callWaiter}
      </button>
      <button
        className="app-button"
        onClick={() => handleEventClick(EventTypes.REQUEST_CHECK)}
      >
        {texts.requestCheck}
      </button>

      {showMessageInput && (
        <div className="message-input">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje opcional"
          />
          <button onClick={handleSubmit}>Enviar</button>
        </div>
      )}
    </div>
  );
};

export default ButtonsGroup;
