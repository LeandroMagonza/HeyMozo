// src/components/EventsList.js

import React from 'react';
import './EventsList.css';
import { EventColors } from '../theme';
import { translateEvent } from '../utils/translations';
import { FaCheckCircle } from 'react-icons/fa';

const EventsList = ({ events, showSeenStatus = true }) => {

  return (
    <ul className="events-list">
      {events.map((event, index) => (
        <li key={index} style={{ backgroundColor: EventColors[event.type] }}>
          <strong>
            {translateEvent(event.type)}
            {showSeenStatus && event.seenAt && (
              <FaCheckCircle 
                style={{ marginLeft: '5px', color: '#4CAF50' }}
                title={`Visto: ${new Date(event.seenAt).toLocaleString()}`}
              />
            )}
          </strong> - {new Date(event.createdAt).toLocaleString()}
          {event.message && <p>Mensaje: {event.message}</p>}
        </li>
      ))}
    </ul>
  );
};

export default EventsList;
