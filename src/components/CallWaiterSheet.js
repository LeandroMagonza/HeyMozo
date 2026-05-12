// src/components/CallWaiterSheet.js
//
// Bottom sheet del flujo cliente. Estructura:
//   • Grid 2×2 con los EventTypes `customerDisplay = 'quick_action'`
//     (configurables por el dueño desde admin — F2).
//   • Debajo, botón alargado con el EventType `customerDisplay = 'main_action'`
//     (típicamente "Llamar al Mozo" genérico, sin razón específica).
//
// El back ya resuelve la jerarquía y filtra hidden/system events
// vía EventConfigService.getCustomerEventsForTable.

import React, { useEffect } from 'react';
import IconRenderer from '../services/iconRenderer';
import './CallWaiterSheet.css';

const CallWaiterSheet = ({
  open,
  quickActions = [],
  mainActions = [],
  onSelect,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasAny = quickActions.length > 0 || mainActions.length > 0;

  return (
    <div
      className="call-waiter-sheet__overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="call-waiter-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Llamar al mozo"
      >
        <div className="call-waiter-sheet__handle" aria-hidden="true" />

        <h2 className="call-waiter-sheet__title">¿Qué necesitás?</h2>
        <p className="call-waiter-sheet__subtitle">
          Tocá una opción y avisamos al mozo
        </p>

        {!hasAny && (
          <div className="call-waiter-sheet__empty">
            No hay opciones configuradas. El dueño puede activarlas desde el
            panel de administración.
          </div>
        )}

        {quickActions.length > 0 && (
          <div className="call-waiter-sheet__grid">
            {quickActions.map((eventType) => (
              <button
                key={eventType.id}
                type="button"
                className="call-waiter-sheet__action rd-tap-scale"
                onClick={() => onSelect?.(eventType)}
              >
                {eventType.userIcon && (
                  <IconRenderer
                    iconName={eventType.userIcon}
                    size="2.5rem"
                    className="call-waiter-sheet__action-icon"
                  />
                )}
                <span className="call-waiter-sheet__action-label">
                  {eventType.eventName}
                </span>
              </button>
            ))}
          </div>
        )}

        {mainActions.map((eventType) => (
          <button
            key={eventType.id}
            type="button"
            className="call-waiter-sheet__main-action rd-tap-scale"
            style={{
              background: eventType.userColor || 'var(--rd-brand-orange)',
              color: eventType.userFontColor || 'var(--rd-text)',
              boxShadow: 'var(--rd-shadow-orange)',
            }}
            onClick={() => onSelect?.(eventType)}
          >
            {eventType.userIcon && (
              <IconRenderer
                iconName={eventType.userIcon}
                size="1.25rem"
                className="call-waiter-sheet__main-action-icon"
              />
            )}
            <span>{eventType.eventName}</span>
          </button>
        ))}

        <button
          type="button"
          className="call-waiter-sheet__cancel"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default CallWaiterSheet;
