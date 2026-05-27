// src/components/UserScreen.js
//
// Cliente: pantalla de aterrizaje post-QR.
// Layout del redesign: header con logo+nombre, saludo gigante,
// 3 botones grandes (Ver Menu, Llamar al Mozo, Pagar), footer.
//
// El CTA "Pagar / Dejar Propina" tiene 2 estados:
//   1. Sin Payment activo → label "Pagar / Dejar Propina", abre
//      PaymentMethodSheet con el desglose de consumo + propina + método.
//   2. Con Payment activo (pending o awaiting_validation) → label dinámico
//      según método (efectivo/tarjeta/transferencia/MODO). Al tocar abre:
//        • cash/card → WaiterOnTheWaySheet ("¡Mozo en camino!")
//        • transfer/modo → OnlinePaymentSheet (alias + datos + "Ya transferí")
// El polling del hook usePendingPayment redirige automáticamente a
// /pago-confirmado cuando el Payment transita a paid (mozo cobró cash/card
// o cajero validó transfer/MODO).

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Phone from './Phone';
import DecorativeGlow from './DecorativeGlow';
import CallWaiterSheet from './CallWaiterSheet';
import PaymentMethodSheet from './PaymentMethodSheet';
import WaiterOnTheWaySheet from './WaiterOnTheWaySheet';
import OnlinePaymentSheet from './OnlinePaymentSheet';
import usePendingPayment from '../hooks/usePendingPayment';
import {
  getCompany,
  getBranch,
  getTable,
  getPublicMenu,
  sendEvent,
  getTableOrders,
} from '../services/api';
import './UserScreen.css';

const EMPTY_GROUPS = { quickActions: [], mainActions: [], all: [] };

const UserScreen = () => {
  const { companyId, branchId, tableId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [table, setTable] = useState(null);
  const [availableEventTypes, setAvailableEventTypes] = useState(EMPTY_GROUPS);
  const [menuLink, setMenuLink] = useState('');
  const [hasInternalMenu, setHasInternalMenu] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState(null); // { label, color }
  const [pastOrders, setPastOrders] = useState([]);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  // Sheet de pago activo. cash/card → "mozo en camino"; transfer/modo →
  // OnlinePaymentSheet con alias + "ya transferí". Una sola flag — el
  // método del pendingPayment elige cuál renderear.
  const [activeSheetOpen, setActiveSheetOpen] = useState(false);
  const scanSentRef = useRef(false);

  const { payment: pendingPayment, cancel: cancelPendingPayment, cancelling: cancelInProgress, refresh: refreshPayment } =
    usePendingPayment();

  const refreshPastOrders = useCallback(async () => {
    try {
      const { data } = await getTableOrders(tableId);
      setPastOrders(data.orders || []);
    } catch (err) {
      setPastOrders([]);
    }
  }, [tableId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companyData, branchData, tableData, menuData] = await Promise.all([
          getCompany(companyId),
          getBranch(branchId),
          getTable(tableId),
          getPublicMenu(branchId).catch(() => ({ data: { categories: [] } })),
        ]);

        setCompany(companyData.data);
        setBranch(branchData.data);
        setTable(tableData.data);

        const raw = tableData.data.availableEventTypes;
        const groups = Array.isArray(raw)
          ? { quickActions: raw, mainActions: [], all: raw }
          : raw || EMPTY_GROUPS;
        setAvailableEventTypes(groups);

        const branchMenu = branchData.data.menu;
        const companyMenu = companyData.data.menu;
        setMenuLink(branchMenu || companyMenu || '');
        setHasInternalMenu((menuData.data.categories || []).length > 0);

        if (!scanSentRef.current) {
          scanSentRef.current = true;
          try {
            await sendEvent(tableId, { systemEventType: 'SCAN', message: null });
          } catch (err) {
            console.error('Error sending scan event:', err);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    loadData();
    refreshPastOrders();
  }, [companyId, branchId, tableId, refreshPastOrders]);

  const showToast = (label, color) => {
    setToast({ label, color });
    setTimeout(() => setToast(null), 1800);
  };

  const handleEventTypeSelected = async (eventType) => {
    try {
      await sendEvent(tableId, { eventTypeId: eventType.id, message: null });
      showToast(`✓ ${eventType.eventName} enviado`, eventType.userColor || '#9333ea');
    } catch (err) {
      console.error('Error sending event:', err);
      showToast('Hubo un error, intentá de nuevo', '#ef4444');
    } finally {
      setSheetOpen(false);
    }
  };

  const handleOpenMenu = () => {
    if (hasInternalMenu) {
      navigate(`/m/${companyId}/${branchId}/${tableId}/menu`);
    } else if (menuLink) {
      window.open(menuLink, '_blank');
    }
  };

  // Click del botón Pagar — bifurca según si hay payment activo o no.
  const handlePayClick = async () => {
    if (pendingPayment) {
      setActiveSheetOpen(true);
      return;
    }
    await refreshPastOrders();
    setPaySheetOpen(true);
  };

  const handlePaymentCreated = (paymentData) => {
    setPaySheetOpen(false);
    refreshPayment();
    setActiveSheetOpen(true);
  };

  const handleCancelPending = async () => {
    const ok = await cancelPendingPayment();
    if (ok) {
      setActiveSheetOpen(false);
      await refreshPastOrders();
      setPaySheetOpen(true);
    }
  };

  // Cliente apretó "Ya transferí" / "Ya pagué" en OnlinePaymentSheet.
  // Re-refrescamos el polling — el sheet sigue abierto pero su contenido
  // pasa a estado "esperando validación" (porque pendingPayment.status
  // ahora es awaiting_validation).
  const handlePaymentDeclared = () => {
    refreshPayment();
  };

  const restaurantName = company?.name || 'Cargando...';
  const tableName = table?.tableName ? `la ${table.tableName}` : '';
  const hasMenu = hasInternalMenu || Boolean(menuLink);

  const pastTotalCents = pastOrders.reduce((s, o) => s + (o.totalCents || 0), 0);
  const hasConsumo = pastOrders.length > 0 && pastTotalCents > 0;
  const payDisabled = !pendingPayment && !hasConsumo;

  const isOnlinePayment = pendingPayment
    && (pendingPayment.method === 'transfer' || pendingPayment.method === 'modo');
  const isAwaitingValidation = pendingPayment
    && pendingPayment.status === 'awaiting_validation';

  const METHOD_LABELS = {
    cash: 'efectivo',
    card_terminal: 'tarjeta',
    transfer: 'transferencia',
    modo: 'MODO',
  };
  const payMethodLabel = pendingPayment ? METHOD_LABELS[pendingPayment.method] : null;
  const payCtaText = pendingPayment
    ? (isAwaitingValidation
        ? `Validando ${payMethodLabel}…`
        : (isOnlinePayment
            ? `Pagar por ${payMethodLabel}`
            : `Esperando al mozo · ${payMethodLabel}`))
    : 'Pagar / Dejar Propina';
  const payIcon = pendingPayment ? 'hourglass_top' : 'credit_card';

  return (
    <Phone className="user-screen">
      <DecorativeGlow />

      <header className="user-screen__header">
        <div className="user-screen__brand">
          <div className="user-screen__brand-icon">
            <span className="material-symbols-outlined">restaurant</span>
          </div>
          <span className="user-screen__brand-name">{restaurantName}</span>
        </div>
      </header>

      <main className="user-screen__main">
        <div className="user-screen__greeting">
          <h1 className="user-screen__hello">¡Hola!</h1>
          {tableName && (
            <p className="user-screen__location">
              Estás en <span className="user-screen__table">{tableName}</span>
            </p>
          )}
          {branch?.name && (
            <p className="user-screen__branch">{branch.name}</p>
          )}
        </div>

        <div className="user-screen__actions">
          <button
            type="button"
            className="user-screen__cta user-screen__cta--menu rd-tap-scale"
            onClick={handleOpenMenu}
            disabled={!hasMenu}
            aria-disabled={!hasMenu}
          >
            <span className="material-symbols-outlined user-screen__cta-icon">restaurant_menu</span>
            <span className="user-screen__cta-label">
              {hasMenu ? 'Ver Menú' : 'Menú no disponible'}
            </span>
          </button>

          <button
            type="button"
            className="user-screen__cta user-screen__cta--waiter rd-tap-scale"
            onClick={() => setSheetOpen(true)}
            disabled={
              availableEventTypes.quickActions.length === 0 &&
              availableEventTypes.mainActions.length === 0
            }
          >
            <span className="material-symbols-outlined user-screen__cta-icon">notifications_active</span>
            <span className="user-screen__cta-label">Llamar al Mozo</span>
          </button>

          <button
            type="button"
            className={`user-screen__cta user-screen__cta--pay rd-tap-scale ${pendingPayment ? 'user-screen__cta--pay-waiting' : ''}`}
            onClick={handlePayClick}
            disabled={payDisabled}
            aria-disabled={payDisabled}
            title={payDisabled ? 'Todavía no hay consumo pendiente' : undefined}
          >
            <span className="material-symbols-outlined user-screen__cta-icon">
              {payIcon}
            </span>
            <span className="user-screen__cta-label">{payCtaText}</span>
          </button>
        </div>
      </main>

      <footer className="user-screen__footer">
        <img src="/images/heymozo-logo.png" alt="HeyMozo" />
        <span>Tecnología HeyMozo</span>
      </footer>

      {toast && (
        <div className="user-screen__toast" style={{ background: toast.color }}>
          {toast.label}
        </div>
      )}

      <CallWaiterSheet
        open={sheetOpen}
        quickActions={availableEventTypes.quickActions}
        mainActions={availableEventTypes.mainActions}
        onSelect={handleEventTypeSelected}
        onClose={() => setSheetOpen(false)}
      />

      <PaymentMethodSheet
        open={paySheetOpen}
        onClose={() => setPaySheetOpen(false)}
        tableId={tableId}
        pastOrders={pastOrders}
        pendingTotalCents={pastTotalCents}
        paymentMethodsEnabled={branch?.paymentMethodsEnabled}
        paymentMethodPriority={branch?.paymentMethodPriority}
        onPaymentCreated={handlePaymentCreated}
      />

      <WaiterOnTheWaySheet
        open={activeSheetOpen && Boolean(pendingPayment) && !isOnlinePayment}
        payment={pendingPayment}
        onClose={() => setActiveSheetOpen(false)}
        onCancel={handleCancelPending}
        cancelling={cancelInProgress}
      />

      <OnlinePaymentSheet
        open={activeSheetOpen && Boolean(pendingPayment) && isOnlinePayment}
        payment={pendingPayment}
        branch={branch}
        onClose={() => setActiveSheetOpen(false)}
        onDeclared={handlePaymentDeclared}
        onCancel={handleCancelPending}
        cancelling={cancelInProgress}
      />
    </Phone>
  );
};

export default UserScreen;
