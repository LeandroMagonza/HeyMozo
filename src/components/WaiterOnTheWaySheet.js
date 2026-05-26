// src/components/WaiterOnTheWaySheet.js
//
// Modal "¡Mozo en camino!" — Sprint 5.4.
// Se muestra después de crear un Payment cash/tarjeta y también cuando el
// cliente vuelve a tocar el botón "Esperando al mozo" en UserScreen (mientras
// el Payment sigue pending). Es NO bloqueante: el cliente cierra y sigue
// navegando. Opcionalmente puede cancelar para elegir otro método.

import React from 'react';
import { FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import './WaiterOnTheWaySheet.css';

const formatPrice = (cents) =>
  ((cents || 0) / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const WaiterOnTheWaySheet = ({ open, payment, onClose, onCancel, cancelling = false }) => {
  if (!open || !payment) return null;

  const isCash = payment.method === 'cash';
  const methodLabel = isCash ? 'efectivo' : 'tarjeta';
  const Icon = isCash ? FaMoneyBillWave : FaCreditCard;
  const accentColor = isCash ? '#16a34a' : '#2563eb';

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
        aria-label="Mozo en camino"
        style={{ '--accent': accentColor }}
      >
        <div className="wotw__icon">
          <Icon />
        </div>

        <h2 className="wotw__title">¡Mozo en camino!</h2>
        <p className="wotw__subtitle">
          Tu mozo ya fue notificado y pasará a cobrarte en <strong>{methodLabel}</strong>.
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
          Entendido, lo espero
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

export default WaiterOnTheWaySheet;
