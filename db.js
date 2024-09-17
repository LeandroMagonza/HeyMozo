// db.js

const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');
const { EventTypes } = require('./src/constants'); // Importamos EventTypes

// Obtener la fecha y hora actual
const currentTime = new Date();

// Función para restar minutos a la fecha actual
const subtractMinutes = (date, minutes) => {
  return new Date(date.getTime() - minutes * 60000);
};

// Generar eventos con fechas relativas
const generateEvent = (type, minMinutesAgo, maxMinutesAgo) => {
  const minutesAgo = faker.number.int({ min: minMinutesAgo, max: maxMinutesAgo });
  const createdAt = subtractMinutes(currentTime, minutesAgo);
  return {
    type,
    createdAt: createdAt.toISOString(),
    message: null,
  };
};

// Mesas disponibles (sin eventos)
const availableTables = [
  {
    id: 1,
    number: '1',
    name: 'Mesa 1',
    events: [
      {
        type: EventTypes.MARK_AVAILABLE,
        createdAt: subtractMinutes(currentTime, 60).toISOString(),
        message: null,
      },
    ],
  },
  {
    id: 2,
    number: '2',
    name: 'Mesa 2',
    events: [
      {
        type: EventTypes.MARK_AVAILABLE,
        createdAt: subtractMinutes(currentTime, 50).toISOString(),
        message: null,
      },
    ],
  },
];

// Mesa ocupada (con evento SCAN)
const occupiedTable = {
  id: 3,
  number: '3',
  name: 'Mesa 3',
  events: [
    {
      type: EventTypes.MARK_AVAILABLE,
      createdAt: subtractMinutes(currentTime, 60).toISOString(),
      message: null,
    },
    generateEvent(EventTypes.SCAN, 40, 50),
  ],
};

// Mesa que llamó al mesero
const calledWaiterTable = {
  id: 4,
  number: '4',
  name: 'Mesa 4',
  events: [
    {
      type: EventTypes.MARK_AVAILABLE,
      createdAt: subtractMinutes(currentTime, 60).toISOString(),
      message: null,
    },
    generateEvent(EventTypes.SCAN, 40, 50),
    generateEvent(EventTypes.CALL_WAITER, 5, 10),
  ],
};

// Mesa que pidió la cuenta
const requestedCheckTable = {
  id: 5,
  number: '5',
  name: 'Mesa 5',
  events: [
    {
      type: EventTypes.MARK_AVAILABLE,
      createdAt: subtractMinutes(currentTime, 60).toISOString(),
      message: null,
    },
    generateEvent(EventTypes.SCAN, 40, 50),
    generateEvent(EventTypes.CALL_WAITER, 20, 30),
    generateEvent(EventTypes.REQUEST_CHECK, 5, 10),
  ],
};

// Todas las mesas
const tables = [
  ...availableTables,
  occupiedTable,
  calledWaiterTable,
  requestedCheckTable,
];

const data = { tables };

// Escribir el archivo db.json
fs.writeFileSync('db.json', JSON.stringify(data, null, 2));

console.log('db.json generado correctamente');
