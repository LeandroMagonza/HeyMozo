export const translateState = (state) => {
  const stateTranslations = {
    'AVAILABLE': 'DISPONIBLE',
    'OCCUPIED': 'OCUPADO',
    'WAITER': 'MOZO LLAMADO',
    'CHECK': 'CUENTA SOLICITADA',
    'WAITER_AND_CHECK': 'MOZO Y CUENTA'
  };

  return stateTranslations[state] || state;
};

export const translateEvent = (event) => {
  const eventTranslations = {
    'MARK_AVAILABLE': 'MARCAR DISPONIBLE',
    'MARK_OCCUPIED': 'MARCAR OCUPADO',
    'SCAN': 'ESCANEAR',
    'CALL_WAITER': 'LLAMAR MOZO',
    'REQUEST_CHECK': 'SOLICITAR CUENTA',
    'MARK_SEEN': 'MARCAR VISTO'
  };

  return eventTranslations[event] || event;
};
