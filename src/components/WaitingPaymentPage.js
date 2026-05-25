// src/components/WaitingPaymentPage.js
//
// Sprint 5.4 — cliente espera que el mozo cobre cash/tarjeta.
// Route: /m/:companyId/:branchId/:tableId/waiting-payment/:paymentId
//
// Polling cada 4s a GET /payments/:id/status:
//   - status='pending'  → seguir esperando
//   - status='paid'     → navigate a /pago-confirmado/:id (placeholder mientras
//                          PostPagoPage real llega en Sprint 5.9).
//   - status='failed'   → navigate de vuelta al menú con mensaje.
//
// Botón "Cancelar pago" cancela el Payment y vuelve al menú.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSpinner, FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import { getPaymentStatus, cancelPayment } from '../services/api';
import Phone from './Phone';
import './WaitingPaymentPage.css';

const POLL_INTERVAL_MS = 4000;

const formatPrice = (cents) =>
  ((cents || 0) / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const METHOD_META = {
  cash: { label: 'efectivo', Icon: FaMoneyBillWave, color: '#16a34a' },
  card_terminal: { label: 'tarjeta', Icon: FaCreditCard, color: '#2563eb' },
};

const WaitingPaymentPage = () => {
  const { companyId, branchId, tableId, paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const aliveRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const { data } = await getPaymentStatus(paymentId);
      if (!aliveRef.current) return;
      setPayment(data);
      if (data.status === 'paid') {
        navigate(`/m/${companyId}/${branchId}/${tableId}/pago-confirmado/${paymentId}`, { replace: true });
      } else if (data.status === 'failed') {
        navigate(`/m/${companyId}/${branchId}/${tableId}/menu`, { replace: true });
      }
    } catch (err) {
      console.warn('Polling payment status falló:', err && err.message);
      setError('No pudimos verificar el estado del pago. Reintentando…');
    }
  }, [paymentId, companyId, branchId, tableId, navigate]);

  useEffect(() => {
    aliveRef.current = true;
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
  }, [poll]);

  const handleCancel = async () => {
    if (cancelling) return;
    if (!window.confirm('¿Cancelar este pago? El mozo dejará de cobrarte.')) return;
    setCancelling(true);
    try {
      await cancelPayment(paymentId);
      navigate(`/m/${companyId}/${branchId}/${tableId}/menu`, { replace: true });
    } catch (err) {
      console.error('Error cancelando pago:', err);
      setCancelling(false);
      setError('No se pudo cancelar. Reintentá.');
    }
  };

  const meta = (payment && METHOD_META[payment.method]) || METHOD_META.cash;
  const MethodIcon = meta.Icon;

  return (
    <Phone>
      <div className="wp-page">
        <div className="wp-card">
          <div className="wp-card__icon" style={{ '--method-color': meta.color }}>
            <MethodIcon />
          </div>
          <h1 className="wp-card__title">Esperando al mozo…</h1>
          <p className="wp-card__subtitle">
            El mozo se acerca a cobrar tu cuenta en <strong>{meta.label}</strong>.
          </p>

          {payment && (
            <div className="wp-card__breakdown">
              <div className="wp-card__row">
                <span>Pedido</span>
                <span>{formatPrice(payment.subtotalCents)}</span>
              </div>
              {payment.tipCents > 0 && (
                <div className="wp-card__row wp-card__row--muted">
                  <span>Propina</span>
                  <span>{formatPrice(payment.tipCents)}</span>
                </div>
              )}
              <div className="wp-card__row wp-card__row--total">
                <span>Total</span>
                <span>{formatPrice(payment.totalCents)}</span>
              </div>
            </div>
          )}

          <div className="wp-card__spinner">
            <FaSpinner className="wp-card__spinner-icon" />
            <span>Esperando confirmación</span>
          </div>

          {error && <div className="wp-card__error">{error}</div>}

          <button
            type="button"
            className="wp-card__cancel rd-tap-scale"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelando…' : 'Cancelar pago'}
          </button>
        </div>
      </div>
    </Phone>
  );
};

export default WaitingPaymentPage;
