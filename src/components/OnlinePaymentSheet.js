// src/components/OnlinePaymentSheet.js
//
// Sheet de pagos online (transferencia / MODO) — Sprint 5.5.
// Se monta sobre el Payment recién creado (status='pending') y guía al
// cliente a pagar:
//   • Muestra alias copiable + datos bancarios (titular, CUIT, CBU).
//   • Para MODO también ofrece un botón "Abrir app MODO" (deeplink `modo://`
//     con fallback al sitio modo.com.ar — sin Business API, la app no acepta
//     un intent de pago directo, así que es solo un atajo para abrir la app).
//   • CTA principal "Ya transferí / Ya pagué" → `declarePaid` → Payment pasa
//     a awaiting_validation y el sheet se cierra.
//   • Botón secundario "Cancelar pago" → cancel.
//
// Cuando el payment está en awaiting_validation, el sheet cambia de estado:
// el CTA "Ya transferí" se reemplaza por un mensaje "Esperando validación
// del cajero…" + spinner; el botón cancelar sigue disponible.
//
// El comprobante es super-opcional (decisión del user): un link tipo
// "Adjuntar comprobante" que actualmente abre solo un input de URL. Si el
// cliente lo deja vacío no pasa nada; el cajero valida desde su app bancaria.

import React, { useState } from 'react';
import { FaUniversity, FaMobileAlt, FaCopy, FaCheck } from 'react-icons/fa';
import { declarePaymentPaid } from '../services/api';
import './OnlinePaymentSheet.css';

const formatPrice = (cents) =>
  ((cents || 0) / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const OnlinePaymentSheet = ({
  open,
  payment,
  branch,
  onClose,
  onDeclared,
  onCancel,
  cancelling = false,
}) => {
  const [copiedField, setCopiedField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [showProofInput, setShowProofInput] = useState(false);

  if (!open || !payment) return null;

  const isModo = payment.method === 'modo';
  const isAwaiting = payment.status === 'awaiting_validation';
  const Icon = isModo ? FaMobileAlt : FaUniversity;
  const accentColor = isModo ? '#0ea5e9' : '#7c3aed';

  const alias = branch?.transferAlias || '';
  const cbu = branch?.transferCbu || '';
  const titular = branch?.transferTitular || '';
  const cuit = branch?.transferCuit || '';

  const copyValue = async (value, fieldKey) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField((cur) => (cur === fieldKey ? null : cur)), 1600);
    } catch (_) {
      // navigator.clipboard puede no estar disponible — fallback: seleccionar.
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(el);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField((cur) => (cur === fieldKey ? null : cur)), 1600);
    }
  };

  const handleOpenModoApp = () => {
    // Intentamos el deeplink. Si la app no está instalada, el browser no
    // navega y queda en la misma página — el fallback (link store) está
    // visible al lado.
    window.location.href = 'modo://';
  };

  const handleDeclare = async () => {
    if (submitting || isAwaiting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = proofUrl.trim() ? { proofUrl: proofUrl.trim() } : {};
      await declarePaymentPaid(payment.id, payload);
      onDeclared?.();
    } catch (err) {
      console.error('Error declarando pago:', err);
      setError(
        (err && err.response && err.response.data && err.response.data.error)
          || 'No se pudo confirmar el pago. Reintentá.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel || cancelling) return;
    const msg = isAwaiting
      ? '¿Cancelar este pago y avisar al cajero que no transferiste?'
      : '¿Cancelar este pago para elegir otro método?';
    if (!window.confirm(msg)) return;
    await onCancel();
  };

  const Row = ({ label, value, fieldKey }) => {
    if (!value) return null;
    const isCopied = copiedField === fieldKey;
    return (
      <div className="ops__row">
        <div className="ops__row-label">{label}</div>
        <button
          type="button"
          className={`ops__row-value rd-tap-scale ${isCopied ? 'ops__row-value--copied' : ''}`}
          onClick={() => copyValue(value, fieldKey)}
          title="Copiar"
        >
          <span className="ops__row-text">{value}</span>
          <span className="ops__row-icon">
            {isCopied ? <FaCheck /> : <FaCopy />}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="ops__overlay" onClick={onClose} role="presentation">
      <div
        className="ops__sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isModo ? 'Pagar con MODO' : 'Transferir'}
        style={{ '--accent': accentColor }}
      >
        <div className="ops__handle" aria-hidden="true" />

        <div className="ops__icon">
          <Icon />
        </div>

        <h2 className="ops__title">
          {isModo ? 'Pagá con MODO' : 'Transferí a este alias'}
        </h2>
        <p className="ops__subtitle">
          {isAwaiting
            ? 'Esperando que el cajero valide tu pago…'
            : (isModo
                ? 'Abrí MODO y pagá al alias del local.'
                : 'Copiá los datos y transferí desde tu app bancaria.')}
        </p>

        <div className="ops__amount">
          <div className="ops__amount-label">MONTO A TRANSFERIR</div>
          <div className="ops__amount-value">{formatPrice(payment.totalCents)}</div>
        </div>

        {isModo && !isAwaiting && (
          <button
            type="button"
            className="ops__modo-cta rd-tap-scale"
            onClick={handleOpenModoApp}
          >
            <FaMobileAlt /> Abrir app MODO
          </button>
        )}

        <div className="ops__details">
          <Row label="Alias" value={alias} fieldKey="alias" />
          <Row label="CBU" value={cbu} fieldKey="cbu" />
          <Row label="Titular" value={titular} fieldKey="titular" />
          <Row label="CUIT" value={cuit} fieldKey="cuit" />
          {!alias && !cbu && (
            <div className="ops__missing">
              ⚠️ El local todavía no configuró los datos de transferencia.
              Avisale al mozo.
            </div>
          )}
        </div>

        {!isAwaiting && (
          <>
            {showProofInput ? (
              <input
                type="url"
                inputMode="url"
                className="ops__proof-input"
                placeholder="https://link-de-imagen.com/comprobante.jpg (opcional)"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            ) : (
              <button
                type="button"
                className="ops__proof-toggle"
                onClick={() => setShowProofInput(true)}
              >
                Adjuntar comprobante (opcional)
              </button>
            )}

            <button
              type="button"
              className="ops__cta rd-tap-scale"
              onClick={handleDeclare}
              disabled={submitting}
            >
              {submitting ? 'Confirmando…' : (isModo ? 'Ya pagué' : 'Ya transferí')}
            </button>
          </>
        )}

        {isAwaiting && (
          <div className="ops__awaiting">
            <span className="ops__awaiting-spinner" aria-hidden="true" />
            <span>El cajero está verificando…</span>
          </div>
        )}

        {error && <div className="ops__error">{error}</div>}

        {onCancel && (
          <button
            type="button"
            className="ops__cancel"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelando…' : 'Cancelar pago'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OnlinePaymentSheet;
