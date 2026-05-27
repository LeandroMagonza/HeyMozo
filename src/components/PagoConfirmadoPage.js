// src/components/PagoConfirmadoPage.js
//
// Placeholder Sprint 5.4 — pantalla de "Pago cobrado" después del mozo.
// En Sprint 5.9 esta ruta va a ser reemplazada por PostPagoPage real (stars +
// tags + Club VIP + Google Maps).
//
// Sprint 5.6 — MP nativo: cuando MP redirige por back_url, el Payment puede
// estar todavía `pending` (el webhook MP no llegó aún) o ya `paid` (webhook
// llegó primero). Si está pending, polleamos cada 2s con timeout de 30s
// mientras mostramos un estado "Procesando pago…". Si llega a `failed` (MP
// rechazó), mostramos un mensaje de error. Para pagos cash/card/transfer
// no hay polling — el cliente llega acá ya con Payment paid.

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import { getPaymentStatus } from '../services/api';
import Phone from './Phone';
import './PagoConfirmadoPage.css';

const formatPrice = (cents) =>
  ((cents || 0) / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

const SUBTITLE_BY_METHOD = {
  cash: 'El mozo cobró tu cuenta.',
  card_terminal: 'El mozo cobró tu cuenta.',
  transfer: 'El cajero validó tu transferencia.',
  modo: 'El cajero validó tu pago.',
  mp_native: 'Mercado Pago confirmó tu pago.'
};

const PagoConfirmadoPage = () => {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const { data } = await getPaymentStatus(paymentId);
        if (cancelled) return;
        setPayment(data);
        return data;
      } catch (err) {
        console.warn('No se pudo cargar el pago confirmado:', err && err.message);
        return null;
      }
    };

    const tick = async () => {
      const data = await fetchOnce();
      if (cancelled) return;
      // Terminal: paid o failed → dejamos de pollear.
      if (data && (data.status === 'paid' || data.status === 'failed')) {
        return;
      }
      // Timeout de seguridad para no quedar polleando para siempre.
      if (Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      setTimeout(tick, POLL_MS);
    };

    tick();
    return () => { cancelled = true; };
  }, [paymentId]);

  const status = payment?.status;
  const isPending = !payment || status === 'pending' || status === 'awaiting_validation';
  const isFailed = status === 'failed';
  const isPaid = status === 'paid';

  let icon;
  let title;
  let subtitle;
  if (isFailed) {
    icon = <FaExclamationCircle />;
    title = 'No pudimos confirmar el pago';
    subtitle = 'Mercado Pago rechazó el cobro o lo cancelaste. Volvé al menú y elegí otro método.';
  } else if (isPending && !timedOut) {
    icon = <FaSpinner className="pc-card__spin" />;
    title = 'Procesando pago…';
    subtitle = 'Esperando confirmación de Mercado Pago. No cierres esta ventana.';
  } else if (isPending && timedOut) {
    icon = <FaExclamationCircle />;
    title = 'Confirmación demorada';
    subtitle = 'El pago todavía no se confirmó. Revisá tu app de Mercado Pago o avisale al mozo.';
  } else {
    icon = <FaCheckCircle />;
    title = '¡Listo!';
    subtitle = (payment && SUBTITLE_BY_METHOD[payment.method]) || 'Tu pago fue confirmado.';
  }

  return (
    <Phone>
      <div className="pc-page">
        <div className={`pc-card ${isFailed ? 'pc-card--error' : ''} ${isPending && !timedOut ? 'pc-card--pending' : ''}`}>
          <div className="pc-card__icon">{icon}</div>
          <h1 className="pc-card__title">{title}</h1>
          <p className="pc-card__subtitle">{subtitle}</p>

          {payment && isPaid && (
            <div className="pc-card__breakdown">
              <div className="pc-card__row">
                <span>Pedido</span>
                <span>{formatPrice(payment.subtotalCents)}</span>
              </div>
              {payment.tipCents > 0 && (
                <div className="pc-card__row pc-card__row--muted">
                  <span>Propina</span>
                  <span>{formatPrice(payment.tipCents)}</span>
                </div>
              )}
              <div className="pc-card__row pc-card__row--total">
                <span>Total cobrado</span>
                <span>{formatPrice(payment.totalCents)}</span>
              </div>
            </div>
          )}

          {isPaid && (
            <p className="pc-card__hint">
              Gracias por usar HeyMozo. Pronto vas a poder dejar tu reseña acá.
            </p>
          )}
        </div>
      </div>
    </Phone>
  );
};

export default PagoConfirmadoPage;
