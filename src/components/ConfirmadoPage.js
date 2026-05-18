// src/components/ConfirmadoPage.js
// Route: /m/:companyId/:branchId/:tableId/confirmado/:orderId
//
// Pantalla post-confirmación. Polea GET /api/orders/:orderId cada 6s.
// Estados:
//   - pending: "Pedido en marcha" + animación ring-pulse + total + items.
//   - ready:   "¡PEDIDO LISTO!" (verde) — el mozo marcó listo.
//   - cancelled: "Pedido cancelado" — caso edge.
//
// Acciones secundarias:
//   - Back en header → UserScreen (raíz /m/:c/:b/:t).
//   - "Llamar al Mozo" → bottom sheet con availableEventTypes de la mesa.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Phone from './Phone';
import ClientPageHeader from './ClientPageHeader';
import CallWaiterSheet from './CallWaiterSheet';
import { getOrder as apiGetOrder, getTable, sendEvent } from '../services/api';
import './ConfirmadoPage.css';

const POLL_MS = 6000;
const EMPTY_GROUPS = { quickActions: [], mainActions: [], all: [] };

const formatPrice = (cents) => {
  const pesos = cents / 100;
  return pesos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
};

const ConfirmadoPage = () => {
  const { companyId, branchId, tableId, orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [availableEventTypes, setAvailableEventTypes] = useState(EMPTY_GROUPS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const pollRef = useRef(null);

  const fetchOnce = useCallback(async () => {
    try {
      const { data } = await apiGetOrder(orderId);
      setOrder(data);
      if (data && data.status !== 'pending' && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) {
      console.error('Error polling order:', err);
      const status = err && err.response && err.response.status;
      if (status === 404) {
        setError('No encontramos el pedido.');
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } else if (status === 401 || status === 403) {
        setError('Esta sesión no tiene acceso al pedido.');
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }
  }, [orderId]);

  useEffect(() => {
    fetchOnce();
    pollRef.current = setInterval(fetchOnce, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOnce]);

  // Cargar availableEventTypes de la mesa para "Llamar al Mozo".
  useEffect(() => {
    getTable(tableId)
      .then((res) => {
        const raw = res.data && res.data.availableEventTypes;
        const groups = Array.isArray(raw)
          ? { quickActions: raw, mainActions: [], all: raw }
          : raw || EMPTY_GROUPS;
        setAvailableEventTypes(groups);
      })
      .catch((err) => console.warn('No se pudo cargar availableEventTypes:', err && err.message));
  }, [tableId]);

  const handleBackToHome = () => {
    navigate(`/m/${companyId}/${branchId}/${tableId}`);
  };

  const handleBackToMenu = () => {
    navigate(`/m/${companyId}/${branchId}/${tableId}/menu`);
  };

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

  const callWaiterEnabled =
    availableEventTypes.quickActions.length > 0 ||
    availableEventTypes.mainActions.length > 0;

  if (error) {
    return (
      <Phone className="confirmado-page">
        <ClientPageHeader title="Pedido" onBack={handleBackToHome} sticky />
        <div className="confirmado-page__center">
          <span className="material-symbols-outlined confirmado-page__error-icon">error</span>
          <p className="confirmado-page__error-text">{error}</p>
          <button type="button" className="confirmado-page__back rd-tap-scale" onClick={handleBackToMenu}>
            Volver al menú
          </button>
        </div>
      </Phone>
    );
  }

  if (!order) {
    return (
      <Phone className="confirmado-page">
        <ClientPageHeader title="Pedido" onBack={handleBackToHome} sticky />
        <div className="confirmado-page__center">
          <div className="confirmado-page__spinner" />
          <p className="confirmado-page__loading-text">Cargando pedido…</p>
        </div>
      </Phone>
    );
  }

  const isReady = order.status === 'ready';
  const isCancelled = order.status === 'cancelled';

  return (
    <Phone className={`confirmado-page${isReady ? ' confirmado-page--ready' : ''}`}>
      <ClientPageHeader title="Pedido" onBack={handleBackToHome} sticky />

      <div className="confirmado-page__center">
        <div
          className={`confirmado-page__check confirmado-page__check--${
            isReady ? 'ready' : isCancelled ? 'cancelled' : 'pending'
          }`}
        >
          <span className="material-symbols-outlined">
            {isReady ? 'restaurant' : isCancelled ? 'block' : 'check'}
          </span>
        </div>

        <h1 className="confirmado-page__title">
          {isReady ? '¡PEDIDO LISTO!' : isCancelled ? 'Pedido cancelado' : 'Pedido en marcha'}
        </h1>

        <p className="confirmado-page__subtitle">
          {isReady
            ? 'Tu pedido está listo. Disfrutalo.'
            : isCancelled
            ? 'Hablá con el mozo si esto fue un error.'
            : 'Ya avisamos al mozo. En breve te lo llevan a la mesa.'}
        </p>

        {order.items && order.items.length > 0 && (
          <ul className="confirmado-page__items">
            {order.items.map((it) => (
              <li key={it.id} className="confirmado-page__item">
                <span className="confirmado-page__item-qty">{it.qty}×</span>
                <span className="confirmado-page__item-name">{it.nameSnapshot}</span>
                <span className="confirmado-page__item-price">
                  {formatPrice(it.unitPriceCents * it.qty)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="confirmado-page__total">
          <span className="confirmado-page__total-label">Total</span>
          <span className="confirmado-page__total-value">{formatPrice(order.totalCents)}</span>
        </div>

        <div className="confirmado-page__actions">
          <button
            type="button"
            className="confirmado-page__primary rd-tap-scale"
            onClick={handleBackToMenu}
          >
            {isReady ? 'Seguir pidiendo' : 'Volver al menú'}
          </button>

          <button
            type="button"
            className="confirmado-page__secondary rd-tap-scale"
            onClick={() => setSheetOpen(true)}
            disabled={!callWaiterEnabled}
          >
            <span className="material-symbols-outlined">notifications_active</span>
            Llamar al Mozo
          </button>
        </div>
      </div>

      {toast && (
        <div className="confirmado-page__toast" style={{ background: toast.color }}>
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
    </Phone>
  );
};

export default ConfirmadoPage;
