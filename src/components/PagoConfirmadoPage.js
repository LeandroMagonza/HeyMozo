// src/components/PagoConfirmadoPage.js
//
// Placeholder Sprint 5.4 — pantalla de "Pago cobrado" después del mozo.
// En Sprint 5.9 esta ruta va a ser reemplazada por PostPagoPage real (stars +
// tags + Club VIP + Google Maps). Por ahora sólo confirma el cobro.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { getPaymentStatus } from '../services/api';
import Phone from './Phone';
import './PagoConfirmadoPage.css';

const formatPrice = (cents) =>
  ((cents || 0) / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const PagoConfirmadoPage = () => {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    getPaymentStatus(paymentId)
      .then(({ data }) => setPayment(data))
      .catch((err) => console.warn('No se pudo cargar el pago confirmado:', err && err.message));
  }, [paymentId]);

  return (
    <Phone>
      <div className="pc-page">
        <div className="pc-card">
          <div className="pc-card__icon">
            <FaCheckCircle />
          </div>
          <h1 className="pc-card__title">¡Listo!</h1>
          <p className="pc-card__subtitle">El mozo cobró tu cuenta.</p>

          {payment && (
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

          <p className="pc-card__hint">
            Gracias por usar HeyMozo. Pronto vas a poder dejar tu reseña acá.
          </p>
        </div>
      </div>
    </Phone>
  );
};

export default PagoConfirmadoPage;
