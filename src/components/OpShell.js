import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { FaStore, FaSignOutAlt, FaUser, FaPlus } from 'react-icons/fa';
import authService from '../services/authService';
import AlertCard from './AlertCard';
import OrderStack from './OrderStack';
import OrderDetailModal from './OrderDetailModal';
import AddOrderModal from './AddOrderModal';
import { getActiveOrders, markOrderReady } from '../services/api';
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

function buildSubtitle(order) {
  const qty = order.items ? order.items.reduce((s, it) => s + it.qty, 0) : 0;
  return `${qty} ${qty === 1 ? 'ítem' : 'ítems'} · ${formatPrice(order.totalCents)}`;
}

const OpShell = () => {
  const { branchId } = useParams();
  const currentUser = authService.getCurrentUser();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [expandedTableIds, setExpandedTableIds] = useState(new Set());

  // Group orders by tableId, sorted: within each group by createdAt ASC (oldest first),
  // groups sorted by their oldest order (most urgent table first).
  const orderGroups = useMemo(() => {
    const map = new Map();
    orders.forEach(order => {
      const key = order.tableId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(order);
    });
    for (const group of map.values()) {
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    return [...map.values()].sort(
      (a, b) => new Date(a[0].createdAt) - new Date(b[0].createdAt)
    );
  }, [orders]);

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

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getActiveOrders(branchId);
      setOrders(res.data);
    } catch (err) {
      console.error('🍽️ OpShell — error fetching active orders:', err);
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL / 1000);
    }
  }, [branchId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : REFRESH_INTERVAL / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Sound on new orders
  useEffect(() => {
    const count = orders.length;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    prevCountRef.current = count;
  }, [orders.length]);

  const handleMarkReady = useCallback(async (orderId) => {
    setMarkingId(orderId);
    try {
      await markOrderReady(orderId);
      setSelectedOrder(null);
      await fetchOrders();
    } catch (err) {
      console.error('🍽️ OpShell — error marking order ready:', err);
    } finally {
      setMarkingId(null);
    }
  }, [fetchOrders]);

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
              {orders.length > 0 && (
                <span className="op-shell__badge-total">{orders.length}</span>
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
          ) : orders.length === 0 ? (
            <div className="op-shell__empty">
              <span className="material-icons op-shell__empty-icon">check_circle</span>
              <p className="op-shell__empty-title">Sin pedidos pendientes</p>
              <p className="op-shell__empty-desc">Los nuevos pedidos aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="op-shell__grid">
              {orderGroups.map((group) => {
                const order = group[0];
                if (group.length === 1) {
                  return (
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
                      onClick={() => setSelectedOrder(order)}
                      onActionClick={() => handleMarkReady(order.id)}
                    />
                  );
                }
                return (
                  <OrderStack
                    key={order.tableId}
                    orders={group}
                    expanded={expandedTableIds.has(order.tableId)}
                    onToggle={() => toggleStack(order.tableId)}
                    onMarkReady={handleMarkReady}
                    markingId={markingId}
                    onSelectOrder={setSelectedOrder}
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
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default OpShell;
