// src/constants.js

// Definición de los tipos de eventos
const EventTypes = {
    SCAN: 'SCAN',
    CALL_WAITER: 'CALL_WAITER',
    REQUEST_CHECK: 'REQUEST_CHECK',
    MARK_SEEN: 'MARK_SEEN',
    MARK_AVAILABLE: 'MARK_AVAILABLE',
    MARK_OCCUPIED: 'MARK_OCCUPIED',
  };
  
  // Definición de los posibles estados de la mesa
  const TableStates = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    WAITER: 'WAITER',
    CHECK: 'CHECK',
  };
  
  // Exportar para uso en Node.js y React
  module.exports = { EventTypes, TableStates };
  