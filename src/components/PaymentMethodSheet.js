// src/components/PaymentMethodSheet.js
//
// Bottom sheet del flujo de pago (Sprint 5.4).
// Se abre desde CartSheet cuando el cliente ya tiene pedidos confirmados y no
// hay items en el carrito. Pasos:
//   1. Selector de propina (10/15/Otro/Nada, default 10%).
//   2. Selector de método (cash / card_terminal en Sprint 5.4 — el resto se
//      muestra como "Próximamente" desde 5.5+).
//   3. Tap en método → POST /api/tables/:id/payments + redirect a
//      /waiting-payment/:paymentId.
//
// El componente NO conoce el subtotal real — el backend lo calcula al crear el
// Payment con balance = sum(Orders) - sum(Payments.paid). El UI sólo muestra
// "Estás por pagar el total pendiente" + breakdown que viene en la response.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import { requestPayment } from '../services/api';
import './PaymentMethodSheet.css';

const formatPrice = (cents) =>
  (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

// Opciones de propina (porcentaje fijo + custom). null = "Nada".
const TIP_OPTIONS = [
  { id: 'pct10', label: '10%', pct: 10 },
  { id: 'pct15', label: '15%', pct: 15 },
  { id: 'custom', label: 'Otro', pct: null },
  { id: 'none', label: 'Sin propina', pct: 0 },
];

// Métodos soportados en 5.4. El resto (mp, transfer, modo) aparecen en
// Sprints 5.5/5.6.
const METHODS = [
  { id: 'cash', apiMethod: 'cash', label: 'Efectivo', subtitle: 'El mozo cobra en la mesa', Icon: FaMoneyBillWave, color: '#16a34a' },
  { id: 'card_terminal', apiMethod: 'card_terminal', label: 'Tarjeta', subtitle: 'El mozo lleva el posnet', Icon: FaCreditCard, color: '#2563eb' },
];

const PaymentMethodSheet = ({
  open,
  onClose,
  companyId,
  branchId,
  tableId,
  pendingTotalCents,
  paymentMethodsEnabled = { cash: true, card: true },
  paymentMethodPriority = ['cash', 'card', 'mp', 'transfer', 'modo'],
}) => {
  const navigate = useNavigate();
  const [tipOptionId, setTipOptionId] = useState('pct10');
  const [customTipText, setCustomTipText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const selectedTipOption = TIP_OPTIONS.find((t) => t.id === tipOptionId) || TIP_OPTIONS[0];

  const tipCents = (() => {
    if (selectedTipOption.id === 'custom') {
      const v = parseInt(customTipText, 10);
      if (!Number.isFinite(v) || v <= 0) return 0;
      // "Otro" interpretado siempre como monto fijo en pesos (no porcentaje).
      return v * 100;
    }
    if (selectedTipOption.pct === 0) return 0;
    return Math.round((pendingTotalCents * selectedTipOption.pct) / 100);
  })();

  const grandTotal = pendingTotalCents + tipCents;

  // Filtra y ordena métodos según config del branch. En 5.4 sólo cash/card
  // disponibles; los otros aparecen disabled como "Próximamente".
  const orderedMethods = paymentMethodPriority
    .filter((key) => key === 'cash' || key === 'card')
    .map((key) => {
      const m = METHODS.find((mm) => mm.id === key || (key === 'card' && mm.id === 'card_terminal'));
      if (!m) return null;
      const enabledKey = key === 'card' ? 'card' : key;
      return { ...m, enabled: paymentMethodsEnabled[enabledKey] !== false };
    })
    .filter(Boolean);

  const handleSelectMethod = async (method) => {
    if (submitting || !method.enabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await requestPayment(tableId, {
        method: method.apiMethod,
        tipCents,
      });
      navigate(`/m/${companyId}/${branchId}/${tableId}/waiting-payment/${data.id}`);
    } catch (err) {
      console.error('Error solicitando pago:', err);
      const msg = (err && err.response && err.response.data && err.response.data.error)
        || 'No se pudo iniciar el pago. Reintentá.';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="pm-sheet__overlay" onClick={onClose} role="presentation">
      <div
        className="pm-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Elegir método de pago"
      >
        <div className="pm-sheet__handle" aria-hidden="true" />

        <div className="pm-sheet__header">
          <h2 className="pm-sheet__title">Pagar la cuenta</h2>
          <button
            type="button"
            className="pm-sheet__close rd-tap-scale"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="pm-sheet__body">
          <section className="pm-sheet__section">
            <h3 className="pm-sheet__section-title">Propina</h3>
            <div className="pm-sheet__tip-grid">
              {TIP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`pm-sheet__tip-chip rd-tap-scale ${tipOptionId === opt.id ? 'pm-sheet__tip-chip--active' : ''}`}
                  onClick={() => setTipOptionId(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {tipOptionId === 'custom' && (
              <input
                type="number"
                inputMode="numeric"
                className="pm-sheet__tip-custom"
                placeholder="Monto en pesos"
                value={customTipText}
                onChange={(e) => setCustomTipText(e.target.value.replace(/[^0-9]/g, ''))}
                min="0"
              />
            )}
          </section>

          <section className="pm-sheet__breakdown">
            <div className="pm-sheet__row">
              <span>Pedido</span>
              <span>{formatPrice(pendingTotalCents)}</span>
            </div>
            <div className="pm-sheet__row pm-sheet__row--muted">
              <span>Propina</span>
              <span>{tipCents > 0 ? formatPrice(tipCents) : '—'}</span>
            </div>
            <div className="pm-sheet__row pm-sheet__row--total">
              <span>Total a pagar</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </section>

          <section className="pm-sheet__section">
            <h3 className="pm-sheet__section-title">¿Cómo pagás?</h3>
            <div className="pm-sheet__methods">
              {orderedMethods.length === 0 && (
                <div className="pm-sheet__empty">
                  No hay métodos de pago habilitados. Avisale al mozo.
                </div>
              )}
              {orderedMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`pm-sheet__method rd-tap-scale ${!m.enabled ? 'pm-sheet__method--disabled' : ''}`}
                  onClick={() => handleSelectMethod(m)}
                  disabled={!m.enabled || submitting}
                  style={{ '--method-color': m.color }}
                >
                  <span className="pm-sheet__method-icon">
                    <m.Icon />
                  </span>
                  <span className="pm-sheet__method-text">
                    <span className="pm-sheet__method-label">{m.label}</span>
                    <span className="pm-sheet__method-subtitle">
                      {m.enabled ? m.subtitle : 'Deshabilitado por el local'}
                    </span>
                  </span>
                  <span className="pm-sheet__method-amount">{formatPrice(grandTotal)}</span>
                </button>
              ))}
            </div>
          </section>

          {error && <div className="pm-sheet__error">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSheet;
