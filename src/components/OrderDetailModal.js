import React from 'react';
import './OrderDetailModal.css';

function formatPrice(cents) {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

function formatWaitTime(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

const OrderDetailModal = ({ order, onClose, onReady, onRelease, loading }) => {
  if (!order) return null;

  const tableName = order.table?.tableName ?? `Mesa ${order.tableId}`;
  const items = order.items ?? [];

  return (
    <div className="order-modal__overlay" onClick={onClose}>
      <div className="order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="order-modal__header">
          <div>
            <h2 className="order-modal__table">{tableName}</h2>
            <p className="order-modal__wait">Hace {formatWaitTime(order.createdAt)}</p>
          </div>
          <button className="order-modal__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="order-modal__items">
          {items.map((item) => (
            <div key={item.id} className="order-modal__item">
              <span className="order-modal__item-qty">{item.qty}×</span>
              <span className="order-modal__item-name">{item.nameSnapshot}</span>
              <span className="order-modal__item-price">
                {formatPrice(item.unitPriceCents * item.qty)}
              </span>
            </div>
          ))}
          {order.notes && (
            <p className="order-modal__notes">Nota: {order.notes}</p>
          )}
        </div>

        <div className="order-modal__footer">
          <div className="order-modal__total">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
          <button
            className="order-modal__ready-btn"
            onClick={onReady}
            disabled={loading}
          >
            {loading ? 'Marcando…' : 'LISTO'}
          </button>
          {onRelease && (
            <button
              className="order-modal__release-btn"
              onClick={onRelease}
              disabled={loading}
            >
              Liberar mesa
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
