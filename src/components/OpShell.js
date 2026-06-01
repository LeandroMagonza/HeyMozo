import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FaStore, FaSignOutAlt, FaUser, FaPlus, FaChair } from 'react-icons/fa';
import authService from '../services/authService';
import AlertCard from './AlertCard';
import TableStack from './TableStack';
import OrderDetailModal from './OrderDetailModal';
import AddOrderModal from './AddOrderModal';
import ReleaseTableModal from './ReleaseTableModal';
import ActiveTablesList from './ActiveTablesList';
import {
  getActiveOrders,
  getActiveAlerts,
  getActiveSessions,
  markOrderReady,
  markTableEventsSeen,
  collectPayment,
  releaseTable,
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

  const [activeTab, setActiveTab] = useState('alertas');
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [markingTableId, setMarkingTableId] = useState(null);
  const [collectingPaymentId, setCollectingPaymentId] = useState(null);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [expandedTableIds, setExpandedTableIds] = useState(new Set());
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

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
      const [ordersRes, alertsRes, sessionsRes] = await Promise.all([
        getActiveOrders(branchId),
        getActiveAlerts(branchId),
        getActiveSessions(branchId),
      ]);
      setOrders(ordersRes.data);
      setAlerts(alertsRes.data);
      setSessions(sessionsRes.data);
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

  // Sprint 5.4: mozo aprieta "Cobré $X" en una AlertCard de payment_request_*.
  // Marca el Payment paid + Event seen — la card desaparece en el próximo poll.
  const handleCollectPayment = useCallback(async (paymentId) => {
    setCollectingPaymentId(paymentId);
    try {
      await collectPayment(paymentId);
      await fetchData();
    } catch (err) {
      console.error('🍽️ OpShell — error cobrando payment:', err);
      alert(
        (err && err.response && err.response.data && err.response.data.error)
          || 'No se pudo registrar el cobro. Reintentá.'
      );
    } finally {
      setCollectingPaymentId(null);
    }
  }, [fetchData]);

  // Liberar mesa desde el Piso (Sprint 5.8). El mozo abre el detalle de un
  // pedido y puede liberar la mesa (cierra la sesión + VACATE). Cubre el caso
  // de mesa que se va sin que el sistema cierre el balance solo. El cajero
  // tiene la lista completa de mesas activas en CajaShell.
  const handleConfirmRelease = useCallback(async (reason) => {
    if (!releaseTarget) return;
    setReleaseLoading(true);
    try {
      await releaseTable(releaseTarget.tableId, { releaseReason: reason });
      setReleaseTarget(null);
      await fetchData();
    } catch (err) {
      console.error('🍽️ OpShell — error liberando mesa:', err);
      alert(
        (err && err.response && err.response.data && err.response.data.error)
          || 'No se pudo liberar la mesa. Reintentá.'
      );
    } finally {
      setReleaseLoading(false);
    }
  }, [releaseTarget, fetchData]);

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

    // Sprint 5.4: si el Event tiene Payment pending de cash/card asociado,
    // la card cobra protagonismo: subtitle muestra monto + método; el botón
    // "Cobré $X" ejecuta collectPayment en vez de mark-seen genérico.
    if (ev.payment && ev.payment.id) {
      const p = ev.payment;
      const methodLabel = p.method === 'cash' ? 'efectivo' : 'tarjeta';
      const subtitle = p.tipCents > 0
        ? `${formatPrice(p.totalCents)} (incluye ${formatPrice(p.tipCents)} de propina) · ${methodLabel}`
        : `${formatPrice(p.totalCents)} · ${methodLabel}`;
      return (
        <AlertCard
          variant={et.cardVariant || 'red'}
          tableName={ev.table?.tableName ?? `Mesa ${tableId}`}
          title={et.eventName || 'Pago pendiente'}
          subtitle={subtitle}
          waitTime={asShadow ? '' : formatWaitTime(ev.createdAt)}
          icon={et.userIcon}
          actionLabel={`Cobré ${formatPrice(p.totalCents)}`}
          disabledBtn={asShadow || collectingPaymentId === p.id}
          onClick={asShadow ? undefined : onCardClick}
          onActionClick={asShadow ? undefined : () => handleCollectPayment(p.id)}
        />
      );
    }

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
  }, [markingId, markingTableId, collectingPaymentId, handleMarkReady, handleAttendTable, handleCollectPayment]);

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
          <button
            type="button"
            className={`op-shell__nav-item${activeTab === 'alertas' ? ' op-shell__nav-item--active' : ''}`}
            onClick={() => setActiveTab('alertas')}
          >
            <FaStore className="op-shell__nav-icon" />
            <span>Alertas</span>
            {(orders.length + alerts.length) > 0 && (
              <span className="op-shell__nav-badge">{orders.length + alerts.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`op-shell__nav-item${activeTab === 'mesas' ? ' op-shell__nav-item--active' : ''}`}
            onClick={() => setActiveTab('mesas')}
          >
            <FaChair className="op-shell__nav-icon" />
            <span>Mesas</span>
            {sessions.length > 0 && (
              <span className="op-shell__nav-badge op-shell__nav-badge--muted">{sessions.length}</span>
            )}
          </button>
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
          <h1 className="op-shell__topnav-title">
            {activeTab === 'alertas' ? 'Panel del Piso' : 'Mesas activas'}
          </h1>
          <div className="op-shell__topnav-actions">
            {activeTab === 'alertas' && (
              <button
                className="op-shell__add-order-btn"
                onClick={() => setShowAddOrder(true)}
                title="Cargar pedido del mozo"
              >
                <FaPlus />
                <span>Nuevo pedido</span>
              </button>
            )}
            <div className="op-shell__topnav-refresh">
              {activeTab === 'alertas' && (orders.length + alerts.length) > 0 && (
                <span className="op-shell__badge-total">{orders.length + alerts.length}</span>
              )}
              <span className="op-shell__countdown">Actualiza en {countdown}s</span>
            </div>
          </div>
        </header>

        <div className="op-shell__content">
          {loading ? (
            <div className="op-shell__empty">
              <p className="op-shell__empty-text">Cargando…</p>
            </div>
          ) : activeTab === 'alertas' ? (
            tableGroups.length === 0 ? (
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
            )
          ) : (
            sessions.length === 0 ? (
              <div className="op-shell__empty">
                <span className="material-icons op-shell__empty-icon">table_restaurant</span>
                <p className="op-shell__empty-title">No hay mesas con consumo</p>
                <p className="op-shell__empty-desc">Las mesas con pedidos aparecerán acá para liberarlas si hace falta.</p>
              </div>
            ) : (
              <ActiveTablesList
                sessions={sessions}
                onRelease={(s) => setReleaseTarget({
                  tableId: s.tableId,
                  tableName: s.tableName ?? `Mesa ${s.tableId}`,
                  balanceCents: s.balanceCents,
                })}
              />
            )
          )}
        </div>
      </main>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReady={() => handleMarkReady(selectedOrder.id)}
          onRelease={() => {
            setReleaseTarget({
              tableId: selectedOrder.tableId,
              tableName: selectedOrder.table?.tableName ?? `Mesa ${selectedOrder.tableId}`,
            });
            setSelectedOrder(null);
          }}
          loading={markingId === selectedOrder.id}
        />
      )}

      {releaseTarget && (
        <ReleaseTableModal
          tableName={releaseTarget.tableName}
          onClose={() => setReleaseTarget(null)}
          onConfirm={handleConfirmRelease}
          loading={releaseLoading}
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
