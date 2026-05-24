// src/components/SessionOrdersList.js
//
// Render dumb de pedidos de la sesión activa (read-only). El padre hace el
// fetch y le pasa orders. Usado dentro de CartSheet como sección
// "Ya enviado a cocina".

import React from 'react';
import './SessionOrdersList.css';

const STATUS_LABEL = {
  pending: 'En marcha',
  ready: 'Listo',
  cancelled: 'Cancelado',
};

const STATUS_CLASS = {
  pending: 'sol-status--pending',
  ready: 'sol-status--ready',
  cancelled: 'sol-status--cancelled',
};

const formatPrice = (cents) =>
  (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const SessionOrdersList = ({ orders }) => {
  if (!orders || orders.length === 0) return null;

  return (
    <ul className="sol-list">
      {orders.map((order) => (
        <li key={order.id} className="sol-card">
          <div className="sol-card-header">
            <span className={`sol-status ${STATUS_CLASS[order.status] || ''}`}>
              {STATUS_LABEL[order.status] || order.status}
            </span>
            <span className="sol-card-time">{formatTime(order.createdAt)}</span>
          </div>

          {order.items && order.items.length > 0 && (
            <ul className="sol-items">
              {order.items.map((it) => (
                <li key={it.id} className="sol-item">
                  <span className="sol-item-qty">{it.qty}×</span>
                  <span className="sol-item-name">{it.nameSnapshot}</span>
                  <span className="sol-item-price">
                    {formatPrice(it.unitPriceCents * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="sol-card-total">
            <span>Subtotal</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default SessionOrdersList;
