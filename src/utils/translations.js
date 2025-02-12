export const translateState = (state) => {
  const stateTranslations = {
    'AVAILABLE': 'DISPONIBLE',
    'OCCUPIED': 'OCUPADO',
    'WAITER': 'MOZO LLAMADO',
    'CHECK': 'CUENTA SOLICITADA',
    'WAITER_AND_CHECK': 'MOZO Y CUENTA',
    'MANAGER': 'ENCARGADO LLAMADO',
    'MANAGER_WAITER': 'ENCARGADO Y MOZO',
    'MANAGER_CHECK': 'ENCARGADO Y CUENTA',
    'MANAGER_WAITER_CHECK': 'ENCARGADO, MOZO Y CUENTA'
  };

  return stateTranslations[state] || state;
};

export const translateEvent = (eventType) => {
  const translations = {
    SCAN: 'Escaneo de mesa',
    CALL_WAITER: 'Llamada al mesero',
    REQUEST_CHECK: 'Solicitud de cuenta',
    MARK_SEEN: 'Eventos vistos',
    MARK_AVAILABLE: 'Mesa liberada',
    MARK_OCCUPIED: 'Mesa ocupada',
    CALL_MANAGER: 'Llamada al encargado'
  };
  return translations[eventType] || eventType;
};
