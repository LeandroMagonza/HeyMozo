// db.js

console.log('Starting database generation');

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
const generateEvent = (type, minutesAgo, withMessage = false) => {
  const createdAt = subtractMinutes(currentTime, minutesAgo);
  return {
    type,
    createdAt: createdAt.toISOString(),
    message: withMessage ? faker.lorem.sentence() : null,
  };
};

// Generar mesas con eventos aleatorios
const generateTable = (id, name, branchId, scenario) => {
  let events = [
    generateEvent(EventTypes.MARK_AVAILABLE, 30),
  ];

  switch(scenario) {
    case 1:
      // Solo MARK_AVAILABLE
      break;
    case 2:
      // MARK_AVAILABLE y SCAN
      events.push(generateEvent(EventTypes.SCAN, faker.number.int({ min: 22, max: 27 })));
      break;
    case 3:
      // MARK_AVAILABLE, SCAN y CALL_WAITER sin mensaje
      events.push(generateEvent(EventTypes.SCAN, 20));
      events.push(generateEvent(EventTypes.CALL_WAITER, faker.number.int({ min: 10, max: 15 })));
      break;
    case 4:
      // MARK_AVAILABLE, SCAN y CALL_WAITER con mensaje
      events.push(generateEvent(EventTypes.SCAN, 20));
      events.push(generateEvent(EventTypes.CALL_WAITER, faker.number.int({ min: 10, max: 15 }), true));
      break;
    case 5:
      // MARK_AVAILABLE, SCAN, CALL_WAITER sin mensaje y REQUEST_CHECK con mensaje
      events.push(generateEvent(EventTypes.SCAN, 20));
      events.push(generateEvent(EventTypes.CALL_WAITER, 15));
      events.push(generateEvent(EventTypes.REQUEST_CHECK, faker.number.int({ min: 2, max: 8 }), true));
      break;
  }

  // Ordenar eventos del más antiguo al más reciente

  return {
    id,
    tableName: name,
    branchId,
    tableDescription: faker.lorem.sentence(),
    events,
  };
};

// Generar sucursales con mesas
const generateBranch = (id, name, companyId) => ({
  id,
  name,
  companyId,
  website: faker.internet.url(),
  menu: faker.internet.url(),
  tableIds: [], // Añadimos esto
});

// Generar compañías con sucursales
const generateCompany = (id, name) => ({
  id,
  name,
  website: faker.internet.url(),
  menu: faker.internet.url(),
  branchIds: [], // Añadimos esto
});

const companies = [
  generateCompany(1, "Fast Food SRL"),
  generateCompany(2, "Restaurantes Gourmet SA"),
];

const branches = [
  generateBranch(1, "Sucursal Centro", 1),
  generateBranch(2, "Sucursal Norte", 1),
  generateBranch(3, "Restaurante La Estrella", 2),
  generateBranch(4, "Bistró El Rincón", 2),
];

const tables = [];
branches.forEach(branch => {
  for (let i = 1; i <= 5; i++) {
    const table = generateTable(tables.length + 1, `Mesa ${i}`, branch.id, i);
    tables.push(table);
    branch.tableIds.push(table.id);
  }
  companies.find(c => c.id === branch.companyId).branchIds.push(branch.id);
});

const data = { companies, branches, tables };

// Añade esto al final del archivo, justo antes de guardar la base de datos
console.log('Database generation complete');

// Escribir el archivo db.json
fs.writeFileSync('db.json', JSON.stringify(data, null, 2));

console.log('db.json generado correctamente');
