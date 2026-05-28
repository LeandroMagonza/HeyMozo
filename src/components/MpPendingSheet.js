// src/components/MpPendingSheet.js
//
// Modal para un Payment mp_native en estado pending — Sprint 5.7 (fix).
// El cliente fue redirigido a Checkout Pro de MP. Mientras no llegue el webhook
// de confirmación, el botón "Pagar" muestra "Procesando con Mercado Pago…".
// Al tocarlo se abre este modal, que explica el estado y permite cancelar
// (para el caso en que el cliente abandonó el checkout o le falló pre-pago y
// no quiere esperar el timeout automático de 15 min — ver MP_PENDING_TIMEOUT_MS
// en services/payments.js).
//
// Reusa el CSS de WaiterOnTheWaySheet (wotw__*) — mismo layout de modal.

import React from 'react';
import { FaCreditCard } from 'react-icons/fa';
import './WaiterOnTheWaySheet.css';

const formatPrice = (cents) =>
  ((cents || 0) / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const MpPendingSheet = ({ open, payment, onClose, onCancel, cancelling = false }) => {
  if (!open || !payment) return null;

  const handleCancel = async () => {
    if (cancelling || !onCancel) return;
    if (!window.confirm('¿Cancelar este pago para elegir otro método?')) return;
    await onCancel();
  };

  return (
    <div className="wotw__overlay" onClick={onClose} role="presentation">
      <div
        className="wotw__sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Procesando con Mercado Pago"
        style={{ '--accent': '#009ee3' }}
      >
        <div className="wotw__icon">
          <FaCreditCard />
        </div>

        <h2 className="wotw__title">Procesando con Mercado Pago</h2>
        <p className="wotw__subtitle">
          Estamos esperando la confirmación de Mercado Pago. Si ya pagaste,
          esta pantalla se va a actualizar sola. Si abandonaste el pago, podés
          cancelarlo y elegir otro método.
        </p>

        <div className="wotw__amount">
          <div className="wotw__amount-label">TOTAL A PAGAR</div>
          <div className="wotw__amount-value">{formatPrice(payment.totalCents)}</div>
        </div>

        <button
          type="button"
          className="wotw__cta rd-tap-scale"
          onClick={onClose}
          disabled={cancelling}
        >
          Entendido, sigo esperando
        </button>

        {onCancel && (
          <button
            type="button"
            className="wotw__cancel"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelando…' : 'Cancelar pago y elegir otro método'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MpPendingSheet;
