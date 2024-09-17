// src/components/EventsList.js

import React from 'react';
import './EventsList.css';

const EventsList = ({ events }) => {
  return (
      <ul>
        {events.map((event, index) => (
          <li key={index}>
            <strong>{event.type}</strong> -{' '}
            {new Date(event.createdAt).toLocaleString()}
            {event.message && <p>Mensaje: {event.message}</p>}
          </li>
        ))}
      </ul>
  );
};

export default EventsList;
