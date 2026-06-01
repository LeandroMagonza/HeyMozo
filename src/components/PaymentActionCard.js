// src/components/PaymentActionCard.js
//
// Card del feed "Acciones" de CajaShell (Sprint 5.8). Dos variantes según el
// Payment:
//   - Transferencia / MODO en awaiting_validation → borde amarillo, botones
//     "Validar" (verde) y "Rechazar" (rojo). Es una tarea: el cliente está
//     esperando que el cajero confirme desde su app bancaria.
//   - MP / efectivo / tarjeta ya paid → borde verde, un solo botón "Entendido"
//     (acuse informativo). El pago ya entró sin acción del cajero.
//
// El componente es tonto: recibe el payment serializado y dispara callbacks.

import React from 'react';
import './PaymentActionCard.css';

function formatPrice(cents) {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

function formatAgo(ts) {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs} h`;
}

const METHOD_LABEL = {
  transfer: 'Transferencia',
  modo: 'MODO',
  mp_native: 'Mercado Pago',
  cash: 'Efectivo',
  card_terminal: 'Tarjeta',
};

const PaymentActionCard = ({ payment, busy, onValidate, onReject, onAcknowledge }) => {
  const isTransfer = payment.status === 'awaiting_validation';
  const tableName = payment.table?.tableName ?? `Mesa ${payment.tableSessionId}`;
  const methodLabel = METHOD_LABEL[payment.method] || payment.method;
  const amount = formatPrice(payment.totalCents);

  return (
    <div className={`payment-action-card payment-action-card--${isTransfer ? 'transfer' : 'acuse'}`}>
      <div className="payment-action-card__header">
        <span className="payment-action-card__table">{tableName}</span>
        <span className="payment-action-card__time">
          {isTransfer ? formatAgo(payment.createdAt) : formatAgo(payment.paidAt)}
        </span>
      </div>

      <div className="payment-action-card__amount">{amount}</div>

      <div className="payment-action-card__meta">
        <span className="payment-action-card__method">{methodLabel}</span>
        <span className="payment-action-card__status">
          {isTransfer ? 'esperando validación' : 'pago confirmado'}
        </span>
      </div>

      {isTransfer && payment.proofUrl && (
        <a
          className="payment-action-card__proof"
          href={payment.proofUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver comprobante
        </a>
      )}

      {isTransfer ? (
        <div className="payment-action-card__actions">
          <button
            className="payment-action-card__btn payment-action-card__btn--reject"
            onClick={() => onReject(payment.id)}
            disabled={busy}
          >
            Rechazar
          </button>
          <button
            className="payment-action-card__btn payment-action-card__btn--validate"
            onClick={() => onValidate(payment.id)}
            disabled={busy}
          >
            Validar
          </button>
        </div>
      ) : (
        <div className="payment-action-card__actions">
          <button
            className="payment-action-card__btn payment-action-card__btn--ack"
            onClick={() => onAcknowledge(payment.id)}
            disabled={busy}
          >
            Entendido
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentActionCard;
