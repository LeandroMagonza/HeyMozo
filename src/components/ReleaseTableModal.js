// src/components/ReleaseTableModal.js
//
// Modal de liberación manual de mesa (Sprint 5.8). Compartido entre CajaShell
// (cajero/owner, sección "Mesas activas") y OpShell (mozo, acción en la card).
// Confirma el cierre de la sesión con un motivo opcional. Surface el balance
// pendiente cuando se conoce, para que el staff vea que está liberando una
// mesa que todavía debe (caso edge: walkout, cobro off-system, comp).

import React, { useState } from 'react';
import './ReleaseTableModal.css';

function formatPrice(cents) {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

const ReleaseTableModal = ({ tableName, balanceCents, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const hasBalance = Number.isFinite(balanceCents) && balanceCents > 0;

  return (
    <div className="release-modal__overlay" onClick={loading ? undefined : onClose}>
      <div className="release-modal" onClick={(e) => e.stopPropagation()}>
        <div className="release-modal__header">
          <h2 className="release-modal__title">Liberar {tableName}</h2>
          <button
            className="release-modal__close"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="release-modal__desc">
          Vas a cerrar la sesión de esta mesa y dejarla libre en el piso.
        </p>

        {hasBalance && (
          <div className="release-modal__balance">
            <span className="release-modal__balance-icon" aria-hidden="true">⚠️</span>
            <span>
              Esta mesa tiene un saldo pendiente de{' '}
              <strong>{formatPrice(balanceCents)}</strong>. Liberala solo si ya
              se cobró por fuera del sistema o lo estás comp.
            </span>
          </div>
        )}

        <label className="release-modal__label" htmlFor="release-reason">
          Motivo (opcional)
        </label>
        <textarea
          id="release-reason"
          className="release-modal__textarea"
          placeholder="Ej: cobrado en efectivo en mano / walkout / cortesía del dueño"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={1024}
          disabled={loading}
        />

        <div className="release-modal__actions">
          <button
            className="release-modal__cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="release-modal__confirm"
            onClick={() => onConfirm(reason)}
            disabled={loading}
          >
            {loading ? 'Liberando…' : 'Liberar mesa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReleaseTableModal;
