// src/components/CallWaiterSheet.js
//
// Bottom sheet that opens when the customer taps "Llamar al Mozo".
// Renders a grid with all availableEventTypes (already filtered server-side
// by EventConfigService.getCustomerEventsForTable) as colored quick-action
// buttons. Tapping one dispatches the event and closes the sheet.

import React, { useEffect } from 'react';
import IconRenderer from '../services/iconRenderer';
import './CallWaiterSheet.css';

const CallWaiterSheet = ({ open, eventTypes = [], onSelect, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

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

        {eventTypes.length === 0 ? (
          <div className="call-waiter-sheet__empty">
            No hay opciones configuradas. Pedile al mozo que las configure
            desde el panel.
          </div>
        ) : (
          <div className="call-waiter-sheet__grid">
            {eventTypes.map((eventType) => (
              <button
                key={eventType.id}
                type="button"
                className="call-waiter-sheet__action rd-tap-scale"
                style={{
                  background: eventType.userColor || 'var(--rd-brand-purple)',
                  color: eventType.userFontColor || 'var(--rd-text)',
                }}
                onClick={() => onSelect?.(eventType)}
              >
                {eventType.userIcon && (
                  <IconRenderer
                    iconName={eventType.userIcon}
                    size="1.75rem"
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
