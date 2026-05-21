import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { FaStore, FaSignOutAlt, FaUser, FaPlus } from 'react-icons/fa';
import authService from '../services/authService';
import AlertCard from './AlertCard';
import TableStack from './TableStack';
import OrderDetailModal from './OrderDetailModal';
import AddOrderModal from './AddOrderModal';
import {
  getActiveOrders,
  getActiveAlerts,
  markOrderReady,
  markTableEventsSeen,
} from '../services/api';
import notificationSound from '../sounds/notification.mp3';
import './OpShell.css';

const REFRESH_INTERVAL = 6000;

function formatWaitTime(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

function formatPrice(cents) {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

const OpShell = () => {
  const { branchId } = useParams();
  const currentUser = authService.getCurrentUser();

  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [markingTableId, setMarkingTableId] = useState(null);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [expandedTableIds, setExpandedTableIds] = useState(new Set());

  // Pila mixta por mesa: Orders + Events de la misma tableId se agrupan en
  // un solo TableStack. Mesas con un único item se rendean como AlertCard
  // suelto (sin stack). Cada item conserva su tipo y action propio.
  const tableGroups = useMemo(() => {
    const map = new Map();

    const ensure = (tableId, tableName) => {
      if (!map.has(tableId)) {
        map.set(tableId, { tableId, tableName, items: [] });
      } else if (tableName && !map.get(tableId).tableName) {
        map.get(tableId).tableName = tableName;
      }
      return map.get(tableId);
    };

    for (const order of orders) {
      const g = ensure(order.tableId, order.table?.tableName);
      g.items.push({
        kind: 'order',
        id: `order-${order.id}`,
        createdAt: order.createdAt,
        order,
      });
    }
    for (const event of alerts) {
      const tableId = event.table?.id ?? event.tableId;
      const g = ensure(tableId, event.table?.tableName);
      g.items.push({
        kind: 'alert',
        id: `alert-${event.id}`,
        createdAt: event.createdAt,
        event,
      });
    }

    for (const g of map.values()) {
      g.items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return [...map.values()].sort(
      (a, b) =>
        new Date(a.items[0].createdAt) - new Date(b.items[0].createdAt)
    );
  }, [orders, alerts]);

  const toggleStack = useCallback((tableId) => {
    setExpandedTableIds(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  }, []);

  const audioRef = useRef(new Audio(notificationSound));
  const prevCountRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, alertsRes] = await Promise.all([
        getActiveOrders(branchId),
        getActiveAlerts(branchId),
      ]);
      setOrders(ordersRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('🍽️ OpShell — error fetching active data:', err);
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL / 1000);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : REFRESH_INTERVAL / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Sound on new pending items (orders + alerts).
  useEffect(() => {
    const count = orders.length + alerts.length;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    prevCountRef.current = count;
  }, [orders.length, alerts.length]);

  const handleMarkReady = useCallback(async (orderId) => {
    setMarkingId(orderId);
    try {
      await markOrderReady(orderId);
      setSelectedOrder(null);
      await fetchData();
    } catch (err) {
      console.error('🍽️ OpShell — error marking order ready:', err);
    } finally {
      setMarkingId(null);
    }
  }, [fetchData]);

  // "Atender" en una AlertCard de Event: replica el mecanismo de AdminScreen
  // (PUT /tables/:id/mark-seen) — marca todos los unseen events de la mesa
  // como vistos y crea un Event MARK_SEEN. Si la mesa tenía varias alertas
  // (Hielo + Servilletas + Llamar al Mozo), todas desaparecen juntas — el
  // mozo va una vez a la mesa y resuelve todo.
  const handleAttendTable = useCallback(async (tableId) => {
    setMarkingTableId(tableId);
    try {
      await markTableEventsSeen(tableId);
      await fetchData();
    } catch (err) {
      console.error('🍽️ OpShell — error marking events seen:', err);
    } finally {
      setMarkingTableId(null);
    }
  }, [fetchData]);

  // Render genérico de un item del stack como AlertCard. `asShadow` apaga
  // wait/badge/actions (se usa para las cards-shadow del collapsed stack).
  // `onCardClick` permite que el TableStack capture el click para expandir.
  const renderItem = useCallback((item, { asShadow = false, onCardClick } = {}) => {
    if (item.kind === 'order') {
      const order = item.order;
      const qty = order.items
        ? order.items.reduce((s, it) => s + it.qty, 0)
        : 0;
      const subtitle = `${qty} ${qty === 1 ? 'ítem' : 'ítems'} · ${formatPrice(order.totalCents)}`;
      return (
        <AlertCard
          variant="purple"
          tableName={order.table?.tableName ?? `Mesa ${order.tableId}`}
          title="Nuevo Pedido"
          subtitle={subtitle}
          waitTime={asShadow ? '' : formatWaitTime(order.createdAt)}
          icon="FaShoppingCart"
          actionLabel="LISTO"
          badgeCount={asShadow ? undefined : qty}
          disabledBtn={asShadow || markingId === order.id}
          onClick={asShadow ? undefined : (onCardClick || (() => setSelectedOrder(order)))}
          onActionClick={asShadow ? undefined : () => handleMarkReady(order.id)}
        />
      );
    }

    const ev = item.event;
    const et = ev.eventType || {};
    const tableId = ev.table?.id ?? ev.tableId;
    return (
      <AlertCard
        variant={et.cardVariant || 'orange'}
        tableName={ev.table?.tableName ?? `Mesa ${tableId}`}
        title={et.eventName || 'Alerta'}
        subtitle={ev.message || undefined}
        waitTime={asShadow ? '' : formatWaitTime(ev.createdAt)}
        icon={et.userIcon}
        actionLabel="Atender"
        disabledBtn={asShadow || markingTableId === tableId}
        onClick={asShadow ? undefined : onCardClick}
        onActionClick={asShadow ? undefined : () => handleAttendTable(tableId)}
      />
    );
  }, [markingId, markingTableId, handleMarkReady, handleAttendTable]);

  const handleLogout = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      authService.logout();
    }
  };

  return (
    <div className="op-shell">
      <aside className="op-shell__sidebar">
        <div className="op-shell__brand">
          <span className="op-shell__brand-name">HeyMozo</span>
          <span className="op-shell__brand-role">Piso</span>
        </div>

        <nav className="op-shell__nav">
          <NavLink
            to={`/piso/${branchId}`}
            end
            className={({ isActive }) =>
              `op-shell__nav-item${isActive ? ' op-shell__nav-item--active' : ''}`
            }
          >
            <FaStore className="op-shell__nav-icon" />
            <span>Panel del piso</span>
          </NavLink>
        </nav>

        <div className="op-shell__footer">
          {currentUser && (
            <>
              <div className="op-shell__user">
                <FaUser className="op-shell__user-icon" />
                <span className="op-shell__user-email">{currentUser.email}</span>
              </div>
              <button className="op-shell__logout" onClick={handleLogout}>
                <FaSignOutAlt />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="op-shell__main">
        <header className="op-shell__topnav">
          <h1 className="op-shell__topnav-title">Panel del Piso</h1>
          <div className="op-shell__topnav-actions">
            <button
              className="op-shell__add-order-btn"
              onClick={() => setShowAddOrder(true)}
              title="Cargar pedido del mozo"
            >
              <FaPlus />
              <span>Nuevo pedido</span>
            </button>
            <div className="op-shell__topnav-refresh">
              {(orders.length + alerts.length) > 0 && (
                <span className="op-shell__badge-total">{orders.length + alerts.length}</span>
              )}
              <span className="op-shell__countdown">Actualiza en {countdown}s</span>
            </div>
          </div>
        </header>

        <div className="op-shell__content">
          {loading ? (
            <div className="op-shell__empty">
              <p className="op-shell__empty-text">Cargando pedidos…</p>
            </div>
          ) : tableGroups.length === 0 ? (
            <div className="op-shell__empty">
              <span className="material-icons op-shell__empty-icon">check_circle</span>
              <p className="op-shell__empty-title">Sin alertas pendientes</p>
              <p className="op-shell__empty-desc">Los nuevos pedidos y llamados aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="op-shell__grid">
              {tableGroups.map((group) => {
                if (group.items.length === 1) {
                  return (
                    <React.Fragment key={`table-${group.tableId}`}>
                      {renderItem(group.items[0])}
                    </React.Fragment>
                  );
                }
                return (
                  <TableStack
                    key={`table-${group.tableId}`}
                    items={group.items}
                    tableId={group.tableId}
                    tableName={group.tableName}
                    expanded={expandedTableIds.has(group.tableId)}
                    onToggle={() => toggleStack(group.tableId)}
                    renderItem={renderItem}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReady={() => handleMarkReady(selectedOrder.id)}
          loading={markingId === selectedOrder.id}
        />
      )}

      {showAddOrder && (
        <AddOrderModal
          branchId={branchId}
          onClose={() => setShowAddOrder(false)}
          onSuccess={() => {
            setShowAddOrder(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default OpShell;
