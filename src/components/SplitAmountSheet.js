// src/components/SplitAmountSheet.js
//
// Sprint 5.7 — "Dividir cuenta" (split por monto).
//
// Bottom sheet que el cliente abre desde el botón "Dividir cuenta" del
// PaymentMethodSheet. Dos opciones:
//   • "El total completo"  → confirm devuelve null (paga todo el balance)
//   • "Solo mi parte"      → input libre en pesos + chips 1/2, 1/3, 1/4 del
//     balance. confirm devuelve cents (= pesos * 100).
//
// Validación: monto > 0, <= outstandingCents. El backend valida de nuevo
// dentro de la transacción contra el outstanding real (otro device puede
// haber pagado mientras tanto).
//
// El split por **ítem** (claims + coordinación real-time) sigue siendo
// Sprint 7. Esto es solo el split por monto declarado.
//
// IMPORTANTE: la propina se aplica sobre la parte que paga el cliente,
// no sobre el total — lo calcula el PaymentMethodSheet leyendo el split.

import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes } from 'react-icons/fa';
import './SplitAmountSheet.css';

const formatPrice = (cents) =>
  (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

// Chips fraccionales. Cada uno pre-llena el input al fraccionar el balance.
const FRACTIONS = [
  { id: 'half',   label: '1/2', divisor: 2 },
  { id: 'third',  label: '1/3', divisor: 3 },
  { id: 'fourth', label: '1/4', divisor: 4 },
];

const SplitAmountSheet = ({
  open,
  onClose,
  outstandingCents,
  initialSplitCents = null,
  onConfirm,
}) => {
  // mode 'full' = paga el total; mode 'partial' = paga monto declarado.
  // Si vino con un split previo, abrimos directo en 'partial' con ese monto.
  const [mode, setMode] = useState(initialSplitCents != null ? 'partial' : 'full');
  // Input string en pesos (no cents) — más natural para el cliente teclear.
  const [amountPesos, setAmountPesos] = useState(
    initialSplitCents != null ? String(Math.floor(initialSplitCents / 100)) : ''
  );

  // Si reabren la sheet con otro initialSplit, sincronizar.
  useEffect(() => {
    if (!open) return;
    setMode(initialSplitCents != null ? 'partial' : 'full');
    setAmountPesos(initialSplitCents != null ? String(Math.floor(initialSplitCents / 100)) : '');
  }, [open, initialSplitCents]);

  const fractions = useMemo(
    () => FRACTIONS.map((f) => ({
      ...f,
      // Math.floor — preferimos cobrar 1 peso de menos que pasarse del balance.
      // (El último que pague cierra la diferencia.)
      cents: Math.floor(outstandingCents / f.divisor),
    })),
    [outstandingCents]
  );

  if (!open) return null;

  const amountCents = (() => {
    const n = parseInt(amountPesos, 10);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n * 100;
  })();

  const partialIsValid = mode === 'partial' && amountCents > 0 && amountCents <= outstandingCents;
  const partialIsOver = mode === 'partial' && amountCents > 0 && amountCents > outstandingCents;
  const canConfirm = mode === 'full' || partialIsValid;

  const handleFraction = (cents) => {
    setMode('partial');
    setAmountPesos(String(Math.floor(cents / 100)));
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(mode === 'full' ? null : amountCents);
  };

  return (
    <div className="split-sheet__overlay" onClick={onClose} role="presentation">
      <div
        className="split-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="¿Cuánto vas a pagar?"
      >
        <div className="split-sheet__handle" aria-hidden="true" />

        <div className="split-sheet__header">
          <h2 className="split-sheet__title">¿CUÁNTO VAS A PAGAR?</h2>
          <button
            type="button"
            className="split-sheet__close rd-tap-scale"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="split-sheet__body">
          <div className="split-sheet__outstanding">
            Saldo pendiente <strong>{formatPrice(outstandingCents)}</strong>
          </div>

          {/* ── Opción "Total completo" ─────────────────── */}
          <button
            type="button"
            className={`split-sheet__option rd-tap-scale ${mode === 'full' ? 'split-sheet__option--active' : ''}`}
            onClick={() => setMode('full')}
          >
            <span className="split-sheet__option-radio" aria-hidden="true" />
            <span className="split-sheet__option-body">
              <span className="split-sheet__option-title">El total completo</span>
              <span className="split-sheet__option-meta">{formatPrice(outstandingCents)}</span>
            </span>
          </button>

          {/* ── Opción "Solo mi parte" ──────────────────── */}
          <div className={`split-sheet__option split-sheet__option--partial ${mode === 'partial' ? 'split-sheet__option--active' : ''}`}>
            <button
              type="button"
              className="split-sheet__option-row rd-tap-scale"
              onClick={() => setMode('partial')}
            >
              <span className="split-sheet__option-radio" aria-hidden="true" />
              <span className="split-sheet__option-body">
                <span className="split-sheet__option-title">Solo mi parte</span>
                <span className="split-sheet__option-meta">Vos elegís el monto</span>
              </span>
            </button>

            <div className="split-sheet__input-row">
              <span className="split-sheet__input-prefix">$</span>
              <input
                type="number"
                inputMode="numeric"
                className="split-sheet__input"
                placeholder="0"
                value={amountPesos}
                onChange={(e) => {
                  setMode('partial');
                  setAmountPesos(e.target.value.replace(/[^0-9]/g, ''));
                }}
                min="1"
                max={Math.floor(outstandingCents / 100)}
                aria-label="Monto en pesos"
              />
            </div>

            <div className="split-sheet__fractions">
              {fractions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="split-sheet__fraction rd-tap-scale"
                  onClick={() => handleFraction(f.cents)}
                >
                  <span className="split-sheet__fraction-label">{f.label}</span>
                  <span className="split-sheet__fraction-amount">{formatPrice(f.cents)}</span>
                </button>
              ))}
            </div>

            {partialIsOver && (
              <div className="split-sheet__error">
                El monto no puede ser mayor al saldo pendiente.
              </div>
            )}
          </div>

          <button
            type="button"
            className="split-sheet__confirm rd-tap-scale"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitAmountSheet;
