// src/components/RedeemVoucherModal.js
//
// Canje de voucher del Club desde OpShell (Sprint 5.11). El mozo le pide al
// cliente el código del premio (que ve en su pantalla al escanear) y lo
// ingresa acá. Al canjear: el backend marca el voucher redeemed + resetea las
// visitas del socio a 0. Self-contained: maneja su propio loading/éxito/error.

import React, { useState } from 'react';
import { redeemVoucher } from '../services/api';
import './RedeemVoucherModal.css';

const RedeemVoucherModal = ({ branchId, onClose, onRedeemed }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Canje a partir de un código, AGNÓSTICO de su origen. Hoy el código llega
  // por el input manual (handleSubmit). El seam para el futuro escáner QR es
  // este mismo método: un modo "scan" que lea el QR del cliente solo tiene que
  // llamar redeemCode(valorLeído) — misma ruta de canje, sin tocar esta lógica
  // ni el backend. El QR del cliente codificaría el `code` verbatim (no hace
  // falta formato nuevo). Por ahora NO renderizamos QR (decisión de producto:
  // arquitectura lista, feature diferida — ver [[project-future-features]]).
  const redeemCode = async (rawCode) => {
    const clean = (rawCode || '').trim().toUpperCase();
    if (!clean || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await redeemVoucher(branchId, clean);
      setResult(data);
      if (onRedeemed) onRedeemed(data);
    } catch (err) {
      setError(
        (err && err.response && err.response.data && err.response.data.error)
        || 'No se pudo canjear el voucher. Revisá el código.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    redeemCode(code);
  };

  return (
    <div className="redeem-modal__overlay" onClick={loading ? undefined : onClose}>
      <div className="redeem-modal" onClick={(e) => e.stopPropagation()}>
        <div className="redeem-modal__header">
          <h2 className="redeem-modal__title">Canjear voucher</h2>
          <button
            className="redeem-modal__close"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {result ? (
          <div className="redeem-modal__success">
            <div className="redeem-modal__success-icon" aria-hidden="true">🎉</div>
            <p className="redeem-modal__success-title">¡Voucher canjeado!</p>
            <p className="redeem-modal__success-reward">{result.reward}</p>
            <p className="redeem-modal__success-meta">
              Socio {result.phone} · contador de visitas reiniciado a 0
            </p>
            <button type="button" className="redeem-modal__done" onClick={onClose}>
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="redeem-modal__desc">
              Pedile al cliente el código del premio (lo ve en su pantalla al
              escanear) e ingresalo acá.
            </p>

            <label className="redeem-modal__label" htmlFor="voucher-code">
              Código del voucher
            </label>
            <input
              id="voucher-code"
              className="redeem-modal__input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: K7H9PQ"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              disabled={loading}
              maxLength={12}
            />

            {error && <p className="redeem-modal__error">{error}</p>}

            <div className="redeem-modal__actions">
              <button
                type="button"
                className="redeem-modal__cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="redeem-modal__confirm"
                disabled={loading || !code.trim()}
              >
                {loading ? 'Canjeando…' : 'Canjear'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RedeemVoucherModal;
