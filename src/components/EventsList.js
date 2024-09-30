// src/components/EventsList.js

import React from 'react';
import './EventsList.css';
import { EventColors } from '../theme';

const EventsList = ({ events }) => {
  return (
    <ul className="events-list">
      {events.map((event, index) => (
        <li key={index} style={{ backgroundColor: EventColors[event.type] }}>
          <strong>{event.type}</strong> - {new Date(event.createdAt).toLocaleString()}
          {event.message && <p>Mensaje: {event.message}</p>}
        </li>
      ))}
    </ul>
  );
};

export default EventsList;
