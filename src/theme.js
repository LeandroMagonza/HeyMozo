const { EventTypes } = require('./constants');

// Definición de los posibles estados de la mesa
export const TableStates = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  WAITER: 'WAITER',
  CHECK: 'CHECK',
  WAITER_AND_CHECK: 'WAITER_AND_CHECK',
};

// Colores para los estados de las mesas y eventos
export const Colors = {
  AVAILABLE: '#98DFAF', // Verde fuerte
  OCCUPIED: '#88ABFF', // Azul fuerte
  ATTENTION: '#FDCA40', // Amarillo fuerte para WAITER y CHECK
};

// Mapeo de colores para los estados de las mesas
export const TableColors = {
  [TableStates.AVAILABLE]: Colors.AVAILABLE,
  [TableStates.OCCUPIED]: Colors.OCCUPIED,
  [TableStates.WAITER]: Colors.ATTENTION,
  [TableStates.CHECK]: Colors.ATTENTION,
  [TableStates.WAITER_AND_CHECK]: Colors.ATTENTION,
};

// Mapeo de colores para los tipos de eventos
export const EventColors = {
  [EventTypes.MARK_AVAILABLE]: Colors.AVAILABLE,
  [EventTypes.MARK_OCCUPIED]: Colors.OCCUPIED,
  [EventTypes.SCAN]: Colors.OCCUPIED,
  [EventTypes.CALL_WAITER]: Colors.ATTENTION,
  [EventTypes.REQUEST_CHECK]: Colors.ATTENTION,
  [EventTypes.MARK_SEEN]: Colors.OCCUPIED,
};
