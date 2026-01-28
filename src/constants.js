// src/constants.js

// Definición de los tipos de eventos
const EventTypes = {
    SCAN: 'SCAN',
    CALL_WAITER: 'CALL_WAITER',
    REQUEST_CHECK: 'REQUEST_CHECK',
    MARK_SEEN: 'MARK_SEEN',
    MARK_AVAILABLE: 'MARK_AVAILABLE',
    MARK_OCCUPIED: 'MARK_OCCUPIED',
    CALL_MANAGER: 'CALL_MANAGER'
};

// Definición de los posibles estados de la mesa
const TableStates = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    WAITER: 'WAITER',
    CHECK: 'CHECK',
};

// Tipos de recursos para configuración de eventos
const ResourceTypes = {
    COMPANY: 'company',
    BRANCH: 'branch',
    LOCATION: 'location'
};

// Lista de tipos de recursos válidos
const VALID_RESOURCE_TYPES = Object.values(ResourceTypes);

// Campos permitidos para crear/actualizar EventTypes (previene mass assignment)
const ALLOWED_EVENT_TYPE_FIELDS = [
    'eventName',
    'stateName',
    'userColor',
    'userFontColor',
    'userIcon',
    'adminColor',
    'priority',
    'isActive'
];

// Campos permitidos para actualizar eventos del sistema
const ALLOWED_SYSTEM_EVENT_FIELDS = [
    'eventName',
    'userColor',
    'userFontColor',
    'userIcon',
    'stateName',
    'adminColor'
];

// Regex para validación
const VALIDATION_PATTERNS = {
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    URL: /^https?:\/\/.+/i
};

// Exportar para uso en Node.js y React
module.exports = {
    EventTypes,
    TableStates,
    ResourceTypes,
    VALID_RESOURCE_TYPES,
    ALLOWED_EVENT_TYPE_FIELDS,
    ALLOWED_SYSTEM_EVENT_FIELDS,
    VALIDATION_PATTERNS
};
  