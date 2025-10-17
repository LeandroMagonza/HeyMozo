import React, { useState, useEffect, useCallback } from 'react';
import { FaTrash, FaCheck, FaEdit, FaPalette, FaUndo } from 'react-icons/fa';
import './EventConfigModal.css';
import IconPicker from './IconPicker';
import IconRenderer from '../services/iconRenderer';

const EventConfigModal = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  companyId,
  branchId = null,
  resourceName
}) => {
  console.log('EventConfigModal rendered with props:', { isOpen, resourceType, resourceId, companyId, branchId, resourceName });
  const [eventsWithConfig, setEventsWithConfig] = useState([]);
  const [pendingOverrides, setPendingOverrides] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    eventName: '',
    stateName: '',
    userColor: '#007bff',
    userFontColor: '#ffffff',
    userIcon: null,
    adminColor: '#ffc107',
    priority: 50
  });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState(null);

  const loadEventsWithConfiguration = useCallback(async () => {
    console.log('loadEventsWithConfiguration called with:', { resourceType, resourceId, companyId, branchId });

    try {
      const queryParams = new URLSearchParams({
        companyId,
        ...(branchId && { branchId })
      });

      const response = await fetch(`/api/resources/${resourceType}/${resourceId}/events/resolved?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Events with configuration loaded:', data);
        setEventsWithConfig(data);
      } else {
        console.error('Failed to load events with configuration:', response.status);
      }
    } catch (error) {
      console.error('Error loading events with configuration:', error);
    }
  }, [resourceType, resourceId, companyId, branchId]);

  useEffect(() => {
    if (isOpen && companyId) {
      setLoading(true);
      setPendingOverrides({});
      loadEventsWithConfiguration().finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, companyId, resourceType, resourceId, loadEventsWithConfiguration]);

  const handleFieldChange = (eventId, field, value) => {
    setPendingOverrides(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value
      }
    }));
  };

  const handleFieldReset = (eventId, field) => {
    setPendingOverrides(prev => {
      const newOverrides = { ...prev };
      if (newOverrides[eventId]) {
        delete newOverrides[eventId][field];
        if (Object.keys(newOverrides[eventId]).length === 0) {
          delete newOverrides[eventId];
        }
      }
      return newOverrides;
    });
  };

  const getEffectiveValue = (event, field) => {
    return pendingOverrides[event.id]?.[field] !== undefined
      ? pendingOverrides[event.id][field]
      : event[field];
  };

  const isFieldOverridden = (event, field) => {
    return pendingOverrides[event.id]?.[field] !== undefined;
  };

  const isEventEnabled = (event) => {
    return getEffectiveValue(event, 'enabled');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configurationsToSave = [];

      for (const [eventId, overrides] of Object.entries(pendingOverrides)) {
        const event = eventsWithConfig.find(e => e.id === parseInt(eventId));
        if (!event) continue;

        const configData = {
          eventTypeId: event.id,
          ...overrides
        };

        configurationsToSave.push(configData);
      }

      console.log('Saving configurations:', configurationsToSave);

      const response = await fetch(`/api/resources/${resourceType}/${resourceId}/events/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        },
        body: JSON.stringify({ configurations: configurationsToSave })
      });

      if (response.ok) {
        setPendingOverrides({});
        await loadEventsWithConfiguration();
        onClose();
      } else {
        console.error('Failed to save configurations');
        alert('Failed to save configurations');
      }
    } catch (error) {
      console.error('Error saving configurations:', error);
      alert('Error saving configurations');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!window.confirm('¿Estás seguro de que quieres restablecer todas las configuraciones para este recurso? Esto heredará las configuraciones del nivel superior.')) {
      return;
    }

    try {
      const response = await fetch(`/api/resources/${resourceType}/${resourceId}/events/config`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        }
      });

      if (response.ok) {
        setPendingOverrides({});
        await loadEventsWithConfiguration();
        alert('Configuraciones restablecidas exitosamente');
      } else {
        console.error('Failed to reset configurations');
        alert('Error al restablecer las configuraciones');
      }
    } catch (error) {
      console.error('Error resetting configurations:', error);
      alert('Error al restablecer las configuraciones');
    }
  };

  const handleCreateEvent = async () => {
    if (resourceType !== 'company') {
      alert('Los eventos personalizados solo pueden crearse a nivel de compañía');
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/event-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        },
        body: JSON.stringify(newEvent)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewEvent({
          eventName: '',
          stateName: '',
          userColor: '#007bff',
          userFontColor: '#ffffff',
          userIcon: null,
          adminColor: '#ffc107',
          priority: 50
        });
        await loadEventsWithConfiguration();
      } else {
        const error = await response.json();
        console.error('Failed to create event type:', error);
        alert('Error creando el tipo de evento: ' + (error.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error creating event type:', error);
      alert('Error creando el tipo de evento');
    }
  };

  const handleDeleteEvent = async (eventId, event) => {
    if (event.systemEventType) {
      alert('Los eventos del sistema no pueden ser eliminados. Solo pueden ser renombrados.');
      return;
    }

    if (resourceType !== 'company') {
      alert('Los eventos personalizados solo pueden eliminarse a nivel de compañía');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres eliminar el evento "${event.eventName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/event-types/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        }
      });

      if (response.ok) {
        await loadEventsWithConfiguration();
      } else {
        const error = await response.json();
        console.error('Failed to delete event type:', error);
        alert('Error eliminando el tipo de evento: ' + (error.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error deleting event type:', error);
      alert('Error eliminando el tipo de evento');
    }
  };

  const getInheritanceIcon = (event) => {
    if (event.configuredAt) {
      switch (event.configuredAt) {
        case 'company': return '🏢';
        case 'branch': return '🏪';
        case 'location': return '📍';
        default: return '⚙️';
      }
    }

    // Not configured at this level - show base/default
    return resourceType === 'company' ? '🏢' : '🔄';
  };

  const getInheritanceText = (event) => {
    if (event.configuredAt) {
      const levelNames = {
        company: 'compañía',
        branch: 'sucursal',
        location: 'mesa'
      };
      return `Configurado a nivel ${levelNames[event.configuredAt]}`;
    }

    if (resourceType === 'company') {
      return 'Configuración base';
    }

    return 'Heredado de nivel superior';
  };

  const handleIconClick = (eventId, currentIcon) => {
    setIconPickerTarget({ eventId, currentIcon });
    setShowIconPicker(true);
  };

  const handleIconSelect = async (iconName) => {
    if (!iconPickerTarget) return;

    // Handle new event icon selection
    if (iconPickerTarget.isNewEvent) {
      setNewEvent(prev => ({ ...prev, userIcon: iconName }));
      setIconPickerTarget(null);
      return;
    }

    // Handle existing event icon override
    handleFieldChange(iconPickerTarget.eventId, 'userIcon', iconName);
    setIconPickerTarget(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="event-config-modal">
        <div className="modal-header">
          <h2>Configurar Eventos - {resourceName}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">Cargando tipos de eventos...</div>
          ) : (
            <>
              <div className="events-section">
                <div className="section-header">
                  <h3>Configuración de Eventos</h3>
                  {resourceType === 'company' && (
                    <button onClick={() => setShowCreateModal(true)} className="create-event-btn">
                      + Crear Evento Personalizado
                    </button>
                  )}
                </div>

                <div className="events-list">
                  {eventsWithConfig.map(event => (
                    <div
                      key={event.id}
                      className={`event-item ${event.configuredAt ? 'configured' : 'inherited'} ${!isEventEnabled(event) ? 'disabled' : ''}`}
                    >
                      <div className="event-info">
                        <div className="event-main">
                          <div className="event-texts">
                            <div className="event-text">
                              <span className="label">Evento:</span>
                              <div className="field-group">
                                <input
                                  type="text"
                                  value={getEffectiveValue(event, 'eventName')}
                                  onChange={(e) => handleFieldChange(event.id, 'eventName', e.target.value)}
                                  className={`field-input ${isFieldOverridden(event, 'eventName') ? 'overridden' : ''}`}
                                  placeholder={event.eventName}
                                />
                                {isFieldOverridden(event, 'eventName') && (
                                  <button
                                    className="reset-field-btn"
                                    onClick={() => handleFieldReset(event.id, 'eventName')}
                                    title="Restablecer al valor heredado"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="event-text">
                              <span className="label">Estado:</span>
                              <div className="field-group">
                                <input
                                  type="text"
                                  value={getEffectiveValue(event, 'stateName')}
                                  onChange={(e) => handleFieldChange(event.id, 'stateName', e.target.value)}
                                  className={`field-input ${isFieldOverridden(event, 'stateName') ? 'overridden' : ''}`}
                                  placeholder={event.stateName}
                                />
                                {isFieldOverridden(event, 'stateName') && (
                                  <button
                                    className="reset-field-btn"
                                    onClick={() => handleFieldReset(event.id, 'stateName')}
                                    title="Restablecer al valor heredado"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="event-meta">
                            <div className="event-colors">
                              <div className="color-field">
                                <input
                                  type="color"
                                  value={getEffectiveValue(event, 'userColor')}
                                  onChange={(e) => handleFieldChange(event.id, 'userColor', e.target.value)}
                                  className={`color-picker ${isFieldOverridden(event, 'userColor') ? 'overridden' : ''}`}
                                  title="Color del botón para clientes"
                                />
                                {isFieldOverridden(event, 'userColor') && (
                                  <button
                                    className="reset-field-btn"
                                    onClick={() => handleFieldReset(event.id, 'userColor')}
                                    title="Restablecer color"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                              </div>

                              <div className="color-field">
                                <input
                                  type="color"
                                  value={getEffectiveValue(event, 'userFontColor')}
                                  onChange={(e) => handleFieldChange(event.id, 'userFontColor', e.target.value)}
                                  className={`color-picker ${isFieldOverridden(event, 'userFontColor') ? 'overridden' : ''}`}
                                  title="Color del texto del botón"
                                />
                                {isFieldOverridden(event, 'userFontColor') && (
                                  <button
                                    className="reset-field-btn"
                                    onClick={() => handleFieldReset(event.id, 'userFontColor')}
                                    title="Restablecer color del texto"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                              </div>

                              <div className="color-field">
                                <input
                                  type="color"
                                  value={getEffectiveValue(event, 'adminColor')}
                                  onChange={(e) => handleFieldChange(event.id, 'adminColor', e.target.value)}
                                  className={`color-picker ${isFieldOverridden(event, 'adminColor') ? 'overridden' : ''}`}
                                  title="Color de estado para administradores"
                                />
                                {isFieldOverridden(event, 'adminColor') && (
                                  <button
                                    className="reset-field-btn"
                                    onClick={() => handleFieldReset(event.id, 'adminColor')}
                                    title="Restablecer color admin"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="event-icon">
                              <div className="icon-field">
                                <div
                                  className={`icon-display clickable ${isFieldOverridden(event, 'userIcon') ? 'overridden' : ''}`}
                                  onClick={() => handleIconClick(event.id, getEffectiveValue(event, 'userIcon'))}
                                  title="Icono del botón - Click para cambiar"
                                >
                                  {getEffectiveValue(event, 'userIcon') ? (
                                    <IconRenderer iconName={getEffectiveValue(event, 'userIcon')} size="1.5em" />
                                  ) : (
                                    <span className="no-icon-placeholder">📷</span>
                                  )}
                                </div>
                                {isFieldOverridden(event, 'userIcon') && (
                                  <button
                                    className="reset-field-btn"
                                    onClick={() => handleFieldReset(event.id, 'userIcon')}
                                    title="Restablecer icono"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                              </div>
                            </div>

                            {!event.systemEventType && (
                              <div className="priority-field">
                                <span className="label">Prioridad:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={getEffectiveValue(event, 'priority')}
                                  onChange={(e) => handleFieldChange(event.id, 'priority', parseInt(e.target.value))}
                                  className={`priority-input ${isFieldOverridden(event, 'priority') ? 'overridden' : ''}`}
                                />
                                {isFieldOverridden(event, 'priority') && (
                                  <button
                                    className="reset-field-btn"
                                    onClick={() => handleFieldReset(event.id, 'priority')}
                                    title="Restablecer prioridad"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                              </div>
                            )}

                            {event.systemEventType && (
                              <span className="system-badge">🔒 Sistema</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="event-controls">
                        <div className="inheritance-info">
                          <span className="inheritance-icon" title={getInheritanceText(event)}>
                            {getInheritanceIcon(event)}
                          </span>
                        </div>

                        {event.systemEventType ? (
                          <div className="system-event-status">
                            <span className="system-label">🔒 Sistema (Siempre activo)</span>
                          </div>
                        ) : (
                          <div className="enabled-field">
                            <label className="checkbox-container">
                              <input
                                type="checkbox"
                                checked={isEventEnabled(event)}
                                onChange={(e) => handleFieldChange(event.id, 'enabled', e.target.checked)}
                              />
                              <span className="checkmark">
                                {isEventEnabled(event) && <FaCheck />}
                              </span>
                            </label>
                            {isFieldOverridden(event, 'enabled') && (
                              <button
                                className="reset-field-btn"
                                onClick={() => handleFieldReset(event.id, 'enabled')}
                                title="Restablecer estado habilitado"
                              >
                                <FaUndo />
                              </button>
                            )}
                          </div>
                        )}

                        {!event.systemEventType && resourceType === 'company' && (
                          <button
                            onClick={() => handleDeleteEvent(event.id, event)}
                            className="delete-event-btn"
                            title="Eliminar evento personalizado"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={handleReset} className="reset-btn">
                  Restablecer Todas las Configuraciones
                </button>
                <div className="primary-actions">
                  <button onClick={onClose} className="cancel-btn">Cancelar</button>
                  <button onClick={handleSave} className="save-btn" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-event-modal">
            <div className="modal-header">
              <h3>Crear Evento Personalizado</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">&times;</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nombre del Evento (Texto para Clientes):</label>
                <input
                  type="text"
                  value={newEvent.eventName}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, eventName: e.target.value }))}
                  placeholder="ej., Solicitar Servicio de Habitación"
                />
              </div>

              <div className="form-group">
                <label>Nombre del Estado (Texto para Administradores):</label>
                <input
                  type="text"
                  value={newEvent.stateName}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, stateName: e.target.value }))}
                  placeholder="ej., Servicio de Habitación Solicitado"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Color del Botón del Cliente:</label>
                  <input
                    type="color"
                    value={newEvent.userColor}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, userColor: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Color del Texto del Botón:</label>
                  <input
                    type="color"
                    value={newEvent.userFontColor}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, userFontColor: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Color de Estado del Administrador:</label>
                  <input
                    type="color"
                    value={newEvent.adminColor}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, adminColor: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Icono del Botón:</label>
                <div className="icon-selection-group">
                  <div className="current-icon-preview">
                    {newEvent.userIcon ? (
                      <>
                        <IconRenderer iconName={newEvent.userIcon} size="1.5em" />
                        <span className="icon-name">{newEvent.userIcon}</span>
                      </>
                    ) : (
                      <span className="no-icon-text">Sin icono</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="select-icon-btn"
                    onClick={() => {
                      setIconPickerTarget({ isNewEvent: true });
                      setShowIconPicker(true);
                    }}
                  >
                    <FaPalette /> Seleccionar Icono
                  </button>
                  {newEvent.userIcon && (
                    <button
                      type="button"
                      className="clear-icon-btn"
                      onClick={() => setNewEvent(prev => ({ ...prev, userIcon: null }))}
                    >
                      <FaTrash /> Quitar
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Prioridad (0-100):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newEvent.priority}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                />
              </div>

              <div className="modal-actions">
                <button onClick={() => setShowCreateModal(false)} className="cancel-btn">Cancelar</button>
                <button 
                  onClick={handleCreateEvent} 
                  className="save-btn"
                  disabled={!newEvent.eventName || !newEvent.stateName}
                >
                  Crear Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <IconPicker
          show={showIconPicker}
          selectedIcon={iconPickerTarget?.currentIcon}
          onIconSelect={handleIconSelect}
          onClose={() => {
            setShowIconPicker(false);
            setIconPickerTarget(null);
          }}
          title="Seleccionar Icono"
        />
      )}
    </div>
  );
};

export default EventConfigModal;