import React, { useState, useEffect, useCallback } from 'react';
import { FaTrash, FaCheck, FaEdit, FaPalette } from 'react-icons/fa';
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
  const [eventTypes, setEventTypes] = useState([]);
  const [configurations, setConfigurations] = useState({});
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
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const loadEventTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/event-types`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEventTypes(data);
      } else {
        console.error('Failed to load event types');
      }
    } catch (error) {
      console.error('Error loading event types:', error);
    }
    setLoading(false);
  }, [companyId]);

  const loadConfigurations = useCallback(async () => {
    try {
      const response = await fetch(`/api/resources/${resourceType}/${resourceId}/events/config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const configMap = {};
        data.forEach(config => {
          configMap[config.eventTypeId] = config.enabled;
        });
        setConfigurations(configMap);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    if (isOpen && companyId) {
      loadEventTypes();
      loadConfigurations();
    }
  }, [isOpen, companyId, resourceType, resourceId, loadEventTypes, loadConfigurations]);

  const handleToggleEvent = async (eventTypeId, enabled) => {
    // Check if this creates a redundant configuration
    const eventType = eventTypes.find(et => et.id === eventTypeId);
    const parentEnabled = getParentConfiguration(eventType);
    
    if (enabled === parentEnabled && resourceType !== 'company') {
      // Remove redundant configuration - it matches parent
      await removeEventConfiguration(eventTypeId);
      const newConfig = { ...configurations };
      delete newConfig[eventTypeId];
      setConfigurations(newConfig);
    } else {
      // Set specific configuration
      setConfigurations(prev => ({
        ...prev,
        [eventTypeId]: enabled
      }));
    }
  };

  const getParentConfiguration = (eventType) => {
    // For company level, there's no parent (all configs are at this level)
    if (resourceType === 'company') return true;
    
    // For branch/location, the default is enabled unless specifically configured
    return true; // This would need to be fetched from actual parent configs in a real implementation
  };

  const removeEventConfiguration = async (eventTypeId) => {
    try {
      await fetch(`/api/resources/${resourceType}/${resourceId}/events/config/${eventTypeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        }
      });
    } catch (error) {
      console.error('Error removing event configuration:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configArray = eventTypes.map(eventType => ({
        eventTypeId: eventType.id,
        enabled: configurations[eventType.id] !== undefined ? configurations[eventType.id] : true
      }));

      const response = await fetch(`/api/resources/${resourceType}/${resourceId}/events/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        },
        body: JSON.stringify({ configurations: configArray })
      });

      if (response.ok) {
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
    if (!window.confirm('Are you sure you want to reset all configurations for this resource? This will inherit from parent configurations.')) {
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
        setConfigurations({});
        alert('Configurations reset successfully');
      } else {
        console.error('Failed to reset configurations');
        alert('Failed to reset configurations');
      }
    } catch (error) {
      console.error('Error resetting configurations:', error);
      alert('Error resetting configurations');
    }
  };

  const handleCreateEvent = async () => {
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
        const createdEventType = await response.json();
        
        // Create EventConfiguration for this resource
        try {
          const configResponse = await fetch(`/api/resources/${resourceType}/${resourceId}/events/config`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
            },
            body: JSON.stringify({ 
              configurations: [{ 
                eventTypeId: createdEventType.id, 
                enabled: true 
              }] 
            })
          });
          
          if (!configResponse.ok) {
            console.warn('Failed to create event configuration, but event type was created');
          }
        } catch (configError) {
          console.warn('Error creating event configuration:', configError);
        }
        
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
        await loadEventTypes(); // Reload event types
        await loadConfigurations(); // Reload configurations
      } else {
        const error = await response.json();
        console.error('Failed to create event type:', error);
        alert('Failed to create event type: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating event type:', error);
      alert('Error creating event type');
    }
  };

  const handleDeleteEvent = async (eventTypeId, eventType) => {
    if (eventType.systemEventType) {
      alert('System events cannot be deleted. They can only be renamed.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the event "${eventType.eventName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/event-types/${eventTypeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        }
      });

      if (response.ok) {
        await loadEventTypes(); // Reload event types
      } else {
        const error = await response.json();
        console.error('Failed to delete event type:', error);
        alert('Failed to delete event type: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting event type:', error);
      alert('Error deleting event type');
    }
  };

  const getInheritanceIcon = (eventType) => {
    const isConfigured = configurations[eventType.id] !== undefined;
    if (isConfigured) {
      switch (resourceType) {
        case 'company': return '🏢';
        case 'branch': return '🏪';
        case 'location': return '📍';
        default: return '⚙️';
      }
    }
    
    // For company level, show company icon (no inheritance)
    if (resourceType === 'company') {
      return '🏢';
    }
    
    // For other levels, show where it's inherited from
    return resourceType === 'branch' ? '🏢' : '🏪'; // Inherited from company or branch
  };

  const getInheritanceText = (eventType) => {
    const isConfigured = configurations[eventType.id] !== undefined;
    if (isConfigured) {
      return `Configurado a nivel ${resourceType === 'company' ? 'compañía' : resourceType === 'branch' ? 'sucursal' : 'mesa'}`;
    }
    
    if (resourceType === 'company') {
      return 'Configuración de compañía';
    }
    
    return resourceType === 'branch' ? 'Heredado de compañía' : 'Heredado de nivel superior';
  };

  const isEventEnabled = (eventType) => {
    return configurations[eventType.id] !== undefined ? configurations[eventType.id] : true;
  };

  const handleEditClick = (eventTypeId, field, currentValue) => {
    setEditingField(`${eventTypeId}-${field}`);
    setEditingValue(currentValue);
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const handleEditSave = async (eventTypeId, field) => {
    try {
      const response = await fetch(`/api/event-types/${eventTypeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        },
        body: JSON.stringify({ [field]: editingValue })
      });

      if (response.ok) {
        // Update the local state
        setEventTypes(prev => prev.map(et => 
          et.id === eventTypeId 
            ? { ...et, [field]: editingValue }
            : et
        ));
        setEditingField(null);
        setEditingValue('');
      } else {
        console.error('Failed to update event type');
        alert('Error actualizando el evento');
      }
    } catch (error) {
      console.error('Error updating event type:', error);
      alert('Error actualizando el evento');
    }
  };

  const handleColorClick = (eventTypeId, colorField, currentColor) => {
    setEditingField(`${eventTypeId}-${colorField}`);
    setEditingValue(currentColor);
  };

  const handleColorSave = async (eventTypeId, colorField) => {
    try {
      const response = await fetch(`/api/event-types/${eventTypeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        },
        body: JSON.stringify({ [colorField]: editingValue })
      });

      if (response.ok) {
        // Update the local state
        setEventTypes(prev => prev.map(et => 
          et.id === eventTypeId 
            ? { ...et, [colorField]: editingValue }
            : et
        ));
        setEditingField(null);
        setEditingValue('');
      } else {
        console.error('Failed to update color');
        alert('Error actualizando el color');
      }
    } catch (error) {
      console.error('Error updating color:', error);
      alert('Error actualizando el color');
    }
  };

  const handleIconClick = (eventTypeId, currentIcon) => {
    setIconPickerTarget({ eventTypeId, currentIcon });
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
    
    // Handle existing event icon update
    try {
      const response = await fetch(`/api/event-types/${iconPickerTarget.eventTypeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heymozo_token')}`
        },
        body: JSON.stringify({ userIcon: iconName })
      });

      if (response.ok) {
        // Update the local state
        setEventTypes(prev => prev.map(et => 
          et.id === iconPickerTarget.eventTypeId 
            ? { ...et, userIcon: iconName }
            : et
        ));
      } else {
        console.error('Failed to save icon');
        alert('Error guardando el icono');
      }
    } catch (error) {
      console.error('Error saving icon:', error);
      alert('Error guardando el icono');
    }
    
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
                  <button onClick={() => setShowCreateModal(true)} className="create-event-btn">
                    + Crear Evento Personalizado
                  </button>
                </div>

                <div className="events-list">
                  {eventTypes.map(eventType => (
                    <div 
                      key={eventType.id} 
                      className={`event-item ${configurations[eventType.id] !== undefined ? 'configured' : 'inherited'}`}
                    >
                      <div className="event-info">
                        <div className="event-main">
                          <div className="event-texts">
                            <div className="event-text">
                              <span className="label">Evento:</span> 
                              {editingField === `${eventType.id}-eventName` ? (
                                <div className="edit-input-group">
                                  <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="edit-input"
                                    autoFocus
                                  />
                                  <button 
                                    className="save-edit-btn"
                                    onClick={() => handleEditSave(eventType.id, 'eventName')}
                                  >
                                    Guardar
                                  </button>
                                  <button 
                                    className="cancel-edit-btn"
                                    onClick={handleEditCancel}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <strong>{eventType.eventName}</strong>
                                  <button 
                                    className="edit-text-btn" 
                                    title="Editar nombre del evento"
                                    onClick={() => handleEditClick(eventType.id, 'eventName', eventType.eventName)}
                                  >
                                    <FaEdit />
                                  </button>
                                </>
                              )}
                            </div>
                            <div className="event-text">
                              <span className="label">Estado:</span> 
                              {editingField === `${eventType.id}-stateName` ? (
                                <div className="edit-input-group">
                                  <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="edit-input"
                                    autoFocus
                                  />
                                  <button 
                                    className="save-edit-btn"
                                    onClick={() => handleEditSave(eventType.id, 'stateName')}
                                  >
                                    Guardar
                                  </button>
                                  <button 
                                    className="cancel-edit-btn"
                                    onClick={handleEditCancel}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <strong>{eventType.stateName}</strong>
                                  <button 
                                    className="edit-text-btn" 
                                    title="Editar nombre del estado"
                                    onClick={() => handleEditClick(eventType.id, 'stateName', eventType.stateName)}
                                  >
                                    <FaEdit />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="event-meta">
                            <div className="event-colors">
                              {editingField === `${eventType.id}-userColor` ? (
                                <div className="color-edit-group">
                                  <input
                                    type="color"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="color-picker"
                                  />
                                  <button 
                                    className="save-edit-btn"
                                    onClick={() => handleColorSave(eventType.id, 'userColor')}
                                  >
                                    Guardar
                                  </button>
                                  <button 
                                    className="cancel-edit-btn"
                                    onClick={handleEditCancel}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="color-box customer-color clickable"
                                  style={{ backgroundColor: eventType.userColor }}
                                  title="Color del botón para clientes - Click para editar"
                                  onClick={() => handleColorClick(eventType.id, 'userColor', eventType.userColor)}
                                ></div>
                              )}
                              
                              {editingField === `${eventType.id}-userFontColor` ? (
                                <div className="color-edit-group">
                                  <input
                                    type="color"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="color-picker"
                                  />
                                  <button 
                                    className="save-edit-btn"
                                    onClick={() => handleColorSave(eventType.id, 'userFontColor')}
                                  >
                                    Guardar
                                  </button>
                                  <button 
                                    className="cancel-edit-btn"
                                    onClick={handleEditCancel}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="color-box font-color clickable"
                                  style={{ backgroundColor: eventType.userFontColor || '#ffffff' }}
                                  title="Color del texto del botón - Click para editar"
                                  onClick={() => handleColorClick(eventType.id, 'userFontColor', eventType.userFontColor || '#ffffff')}
                                ></div>
                              )}
                              
                              {editingField === `${eventType.id}-adminColor` ? (
                                <div className="color-edit-group">
                                  <input
                                    type="color"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="color-picker"
                                  />
                                  <button 
                                    className="save-edit-btn"
                                    onClick={() => handleColorSave(eventType.id, 'adminColor')}
                                  >
                                    Guardar
                                  </button>
                                  <button 
                                    className="cancel-edit-btn"
                                    onClick={handleEditCancel}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="color-box admin-color clickable"
                                  style={{ backgroundColor: eventType.adminColor }}
                                  title="Color de estado para administradores - Click para editar"
                                  onClick={() => handleColorClick(eventType.id, 'adminColor', eventType.adminColor)}
                                ></div>
                              )}
                            </div>
                            
                            <div className="event-icon">
                              <div 
                                className="icon-display clickable"
                                onClick={() => handleIconClick(eventType.id, eventType.userIcon)}
                                title="Icono del botón - Click para editar"
                              >
                                {eventType.userIcon ? (
                                  <IconRenderer iconName={eventType.userIcon} size="1.5em" />
                                ) : (
                                  <span className="no-icon-placeholder">📷</span>
                                )}
                              </div>
                            </div>
                            {!eventType.systemEventType && (
                              <span className="priority">Prioridad: {eventType.priority}</span>
                            )}
                            {eventType.systemEventType && (
                              <span className="system-badge">🔒 Sistema</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="event-controls">
                        <div className="inheritance-info">
                          <span className="inheritance-icon" title={getInheritanceText(eventType)}>
                            {getInheritanceIcon(eventType)}
                          </span>
                        </div>

                        {!eventType.systemEventType && (
                          <div className="event-checkbox">
                            <label className="checkbox-container">
                              <input
                                type="checkbox"
                                checked={isEventEnabled(eventType)}
                                onChange={(e) => handleToggleEvent(eventType.id, e.target.checked)}
                              />
                              <span className="checkmark">
                                {isEventEnabled(eventType) && <FaCheck />}
                              </span>
                            </label>
                          </div>
                        )}

                        {!eventType.systemEventType && (
                          <button
                            onClick={() => handleDeleteEvent(eventType.id, eventType)}
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