// src/components/PaymentMethodSheet.js
//
// Sheet de pagar/dejar propina.
// Layout (post-5.6 — todos los métodos funcionales):
//   • Header "PAGAR / DEJAR PROPINA"
//   • Card de consumo: items agrupados de la sesión + SUBTOTAL CONSUMO
//   • Card de propina: chips 10/15/Otro/Nada (la propina se aplica solo a
//     cash/tarjeta; transfer/MODO/MP ignoran el tip — la propina post-pago
//     digital se resuelve en PostPagoPage en Sprint 5.9)
//   • Total grande verde (Consumo + Propina)
//   • Link "Dividir cuenta" (función real en Sprint 5.7, solo visual ahora)
//   • Métodos con jerarquía:
//       - MP nativo (primary CTA azul, fullwidth) — Sprint 5.6: redirect a
//         Checkout Pro de MP; vuelve por back_url a /pago-confirmado
//       - Transferencia (secondary fullwidth) — Sprint 5.5
//       - Grid 2-col: Tarjeta + MODO + Efectivo — Sprint 5.4/5.5
//
// MP nativo: el handler del POST devuelve `mpInitPoint` además del Payment.
// En ese caso NO llamamos onPaymentCreated (no se monta waiting sheet),
// hacemos `window.location.href = mpInitPoint`. Si MP confirma antes de que
// el cliente vuelva, el polling de usePendingPayment lo redirige; si vuelve
// primero, PagoConfirmadoPage pollea hasta que el webhook llegue.
//
// Para cash/card/transfer/modo: como antes — onPaymentCreated(payment) y el
// padre monta el waiting sheet correspondiente.
//
// Nota propina: la decisión cerrada de Fase 2 (PHASE2_PLAN §Sprint 5) excluye
// propina en transfer/MODO. La sheet sigue mostrando el bloque para no romper
// el layout, pero el backend ignora tipCents para esos métodos.

import React, { useState, useMemo } from 'react';
import {
  FaTimes,
  FaMoneyBillWave,
  FaCreditCard,
  FaUniversity,
  FaMobileAlt,
} from 'react-icons/fa';
import { requestPayment } from '../services/api';
import './PaymentMethodSheet.css';

const formatPrice = (cents) =>
  (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const TIP_OPTIONS = [
  { id: 'pct10', label: '10%', pct: 10 },
  { id: 'pct15', label: '15%', pct: 15 },
  { id: 'custom', label: 'Otro', pct: null },
  { id: 'none', label: 'Nada', pct: 0 },
];

// Catálogo de métodos. `apiMethod = null` significa "aún no implementado" y
// el chip aparece deshabilitado con "Próximamente". Los IDs (`mp`, `transfer`,
// `card`, `modo`, `cash`) coinciden con `Branch.paymentMethodsEnabled`.
const METHOD_DEFS = {
  mp:       { id: 'mp',       apiMethod: 'mp_native',     label: 'Mercado Pago',  Icon: FaCreditCard,    variant: 'primary' },
  transfer: { id: 'transfer', apiMethod: 'transfer',      label: 'Transferencia', Icon: FaUniversity,    variant: 'secondary' },
  card:     { id: 'card',     apiMethod: 'card_terminal', label: 'Tarjeta',       Icon: FaCreditCard,    variant: 'chip' },
  modo:     { id: 'modo',     apiMethod: 'modo',          label: 'MODO',          Icon: FaMobileAlt,     variant: 'chip' },
  cash:     { id: 'cash',     apiMethod: 'cash',          label: 'Efectivo',      Icon: FaMoneyBillWave, variant: 'chip' },
};

// `pastOrders` viene del padre (UserScreen / MenuClient) — array de orders con
// items embebidos. Agrupamos por menuItemId para mostrar "5x panj $60" en vez
// de cinco líneas individuales.
function groupItems(pastOrders) {
  const acc = new Map();
  for (const order of pastOrders || []) {
    for (const it of order.items || []) {
      const key = it.menuItemId || it.id;
      const unit = it.unitPriceCents || it.priceCents || 0;
      const name = it.nameSnapshot || it.menuItem?.name || it.name || 'Item';
      const existing = acc.get(key);
      if (existing) {
        existing.qty += it.qty;
        existing.totalCents += unit * it.qty;
      } else {
        acc.set(key, { key, name, qty: it.qty, totalCents: unit * it.qty });
      }
    }
  }
  return [...acc.values()];
}

const PaymentMethodSheet = ({
  open,
  onClose,
  tableId,
  pastOrders = [],
  pendingTotalCents,
  paymentMethodsEnabled = { cash: true, card: true, mp: true, transfer: true, modo: true },
  paymentMethodPriority = ['mp', 'transfer', 'card', 'modo', 'cash'],
  onPaymentCreated,
}) => {
  const [tipOptionId, setTipOptionId] = useState('pct10');
  const [customTipText, setCustomTipText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const items = useMemo(() => groupItems(pastOrders), [pastOrders]);

  if (!open) return null;

  const selectedTip = TIP_OPTIONS.find((t) => t.id === tipOptionId) || TIP_OPTIONS[0];

  const tipCents = (() => {
    if (selectedTip.id === 'custom') {
      const v = parseInt(customTipText, 10);
      if (!Number.isFinite(v) || v <= 0) return 0;
      return v * 100;
    }
    if (selectedTip.pct === 0) return 0;
    return Math.round((pendingTotalCents * selectedTip.pct) / 100);
  })();

  const grandTotal = pendingTotalCents + tipCents;

  // Solo mostramos métodos que el branch tiene enabled. Mantiene el orden de
  // `paymentMethodPriority` aunque visualmente cada variant cae en su lugar.
  const visibleMethods = paymentMethodPriority
    .map((key) => METHOD_DEFS[key])
    .filter((m) => m && paymentMethodsEnabled[m.id] !== false);

  const primary = visibleMethods.find((m) => m.variant === 'primary');
  const secondary = visibleMethods.find((m) => m.variant === 'secondary');
  const chips = visibleMethods.filter((m) => m.variant === 'chip');

  const handleSelect = async (method) => {
    if (submitting || !method.apiMethod) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await requestPayment(tableId, {
        method: method.apiMethod,
        tipCents,
      });
      // MP nativo: el backend devuelve mpInitPoint → redirect al checkout
      // hosteado de MP. No montamos waiting sheet (el cliente sale del SPA).
      if (data.mpInitPoint) {
        window.location.href = data.mpInitPoint;
        return;
      }
      onPaymentCreated?.(data);
    } catch (err) {
      console.error('Error solicitando pago:', err);
      const msg = (err && err.response && err.response.data && err.response.data.error)
        || 'No se pudo iniciar el pago. Reintentá.';
      setError(msg);
    } finally {
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
        aria-label="Pagar / Dejar propina"
      >
        <div className="pm-sheet__handle" aria-hidden="true" />

        <div className="pm-sheet__header">
          <h2 className="pm-sheet__title">PAGAR / DEJAR PROPINA</h2>
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
          {/* ── Card de consumo ───────────────────────────── */}
          <section className="pm-sheet__card pm-sheet__consumo">
            {items.length === 0 ? (
              <div className="pm-sheet__consumo-empty">
                No hay consumo pendiente todavía.
              </div>
            ) : (
              <>
                <ul className="pm-sheet__consumo-list">
                  {items.map((it) => (
                    <li key={it.key} className="pm-sheet__consumo-item">
                      <span className="pm-sheet__consumo-qty">{it.qty}x</span>
                      <span className="pm-sheet__consumo-name">{it.name}</span>
                      <span className="pm-sheet__consumo-price">{formatPrice(it.totalCents)}</span>
                    </li>
                  ))}
                </ul>
                <div className="pm-sheet__consumo-divider" />
                <div className="pm-sheet__consumo-subtotal">
                  <span>SUBTOTAL CONSUMO</span>
                  <span>{formatPrice(pendingTotalCents)}</span>
                </div>
              </>
            )}
          </section>

          {/* ── Card de propina ───────────────────────────── */}
          <section className="pm-sheet__card pm-sheet__tip">
            <div className="pm-sheet__tip-header">
              <span className="pm-sheet__tip-label">Propina</span>
              <span className="pm-sheet__tip-emoji" role="img" aria-label="propina">💸</span>
            </div>
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

          {/* ── Total grande ──────────────────────────────── */}
          <div className="pm-sheet__total-block">
            <div className="pm-sheet__total-value">{formatPrice(grandTotal)}</div>
            <div className="pm-sheet__total-label">Total a pagar (Consumo + Propina)</div>
            <button type="button" className="pm-sheet__split" disabled title="Próximamente">
              <span className="material-symbols-outlined">receipt_long</span>
              Dividir cuenta
            </button>
          </div>

          {/* ── Métodos ────────────────────────────────────── */}
          {visibleMethods.length === 0 ? (
            <div className="pm-sheet__empty">
              No hay métodos de pago habilitados. Avisale al mozo.
            </div>
          ) : (
            <div className="pm-sheet__methods">
              {primary && (
                <button
                  type="button"
                  className={`pm-sheet__method-primary rd-tap-scale ${!primary.apiMethod ? 'pm-sheet__method--disabled' : ''}`}
                  onClick={() => handleSelect(primary)}
                  disabled={!primary.apiMethod || submitting}
                  title={!primary.apiMethod ? 'Próximamente' : undefined}
                >
                  {primary.label}
                  {!primary.apiMethod && <span className="pm-sheet__method-pill">Próximamente</span>}
                </button>
              )}
              {secondary && (
                <button
                  type="button"
                  className={`pm-sheet__method-secondary rd-tap-scale ${!secondary.apiMethod ? 'pm-sheet__method--disabled' : ''}`}
                  onClick={() => handleSelect(secondary)}
                  disabled={!secondary.apiMethod || submitting}
                  title={!secondary.apiMethod ? 'Próximamente' : undefined}
                >
                  {secondary.Icon && (
                    <span className="pm-sheet__method-icon"><secondary.Icon /></span>
                  )}
                  {secondary.label}
                  {!secondary.apiMethod && <span className="pm-sheet__method-pill">Próximamente</span>}
                </button>
              )}
              {chips.length > 0 && (
                <div className="pm-sheet__chips">
                  {chips.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`pm-sheet__method-chip rd-tap-scale ${!m.apiMethod ? 'pm-sheet__method--disabled' : ''}`}
                      onClick={() => handleSelect(m)}
                      disabled={!m.apiMethod || submitting}
                      title={!m.apiMethod ? 'Próximamente' : undefined}
                    >
                      {m.Icon && (
                        <span className="pm-sheet__method-icon"><m.Icon /></span>
                      )}
                      <span className="pm-sheet__method-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className="pm-sheet__error">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSheet;
