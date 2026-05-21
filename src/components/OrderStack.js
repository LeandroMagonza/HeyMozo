import React from 'react';
import AlertCard from './AlertCard';
import './OrderStack.css';

const LAYER_OFFSET = 7; // px per shadow layer
const MAX_SHADOWS = 2;  // shadow layers behind the top card

function formatWaitTime(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

function formatPrice(cents) {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

function buildSubtitle(order) {
  const qty = order.items ? order.items.reduce((s, it) => s + it.qty, 0) : 0;
  return `${qty} ${qty === 1 ? 'ítem' : 'ítems'} · ${formatPrice(order.totalCents)}`;
}

// orders: sorted by createdAt ASC (oldest first — deliver first)
const OrderStack = ({ orders, expanded, onToggle, onMarkReady, markingId, onSelectOrder }) => {
  const topOrder = orders[0];
  const shadowCount = Math.min(orders.length - 1, MAX_SHADOWS);
  // orders beyond what's shown in the collapsed stack (top + MAX_SHADOWS)
  const hiddenCount = Math.max(0, orders.length - 1 - MAX_SHADOWS);

  if (expanded) {
    return (
      <div className="order-stack order-stack--expanded">
        <button type="button" className="order-stack__header" onClick={onToggle}>
          <span className="order-stack__header-name">
            {topOrder.table?.tableName ?? `Mesa ${topOrder.tableId}`}
          </span>
          <span className="order-stack__header-count">{orders.length} pedidos</span>
          <span className="order-stack__header-chevron" aria-hidden="true">▲</span>
        </button>
        <div className="order-stack__list">
          {orders.map((order) => (
            <AlertCard
              key={order.id}
              variant="purple"
              tableName={order.table?.tableName ?? `Mesa ${order.tableId}`}
              title="Nuevo Pedido"
              subtitle={buildSubtitle(order)}
              waitTime={formatWaitTime(order.createdAt)}
              icon="FaShoppingCart"
              actionLabel="LISTO"
              badgeCount={order.items ? order.items.reduce((s, it) => s + it.qty, 0) : 0}
              disabledBtn={markingId === order.id}
              onClick={() => onSelectOrder(order)}
              onActionClick={() => onMarkReady(order.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Collapsed — visual stack with shadows
  return (
    <div className="order-stack order-stack--collapsed">
      {/* Shadow cards rendered first (behind) */}
      {Array.from({ length: shadowCount }).map((_, i) => (
        <div
          key={i}
          className="order-stack__shadow"
          style={{
            top: `${(i + 1) * LAYER_OFFSET}px`,
            left: `${(i + 1) * LAYER_OFFSET}px`,
            opacity: i === 0 ? 0.85 : 0.7,
          }}
          aria-hidden="true"
        >
          <AlertCard
            variant="purple"
            tableName={topOrder.table?.tableName ?? `Mesa ${topOrder.tableId}`}
            title="Nuevo Pedido"
            subtitle={buildSubtitle(topOrder)}
            waitTime=""
            icon="FaShoppingCart"
            actionLabel="LISTO"
          />
        </div>
      ))}

      {/* Top card — foreground, clickable to expand */}
      <div className="order-stack__top">
        <AlertCard
          variant="purple"
          tableName={topOrder.table?.tableName ?? `Mesa ${topOrder.tableId}`}
          title="Nuevo Pedido"
          subtitle={buildSubtitle(topOrder)}
          waitTime={formatWaitTime(topOrder.createdAt)}
          icon="FaShoppingCart"
          actionLabel="LISTO"
          badgeCount={topOrder.items ? topOrder.items.reduce((s, it) => s + it.qty, 0) : 0}
          disabledBtn={markingId === topOrder.id}
          onClick={onToggle}
          onActionClick={() => onMarkReady(topOrder.id)}
        />
        {hiddenCount > 0 && (
          <div className="order-stack__more-badge" aria-label={`${hiddenCount} pedidos más`}>
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStack;
