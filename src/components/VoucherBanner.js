// src/components/VoucherBanner.js
//
// Banner "próxima visita" (Sprint 5.11). Cuando el cliente escanea el QR y el
// backend detecta — por su device — un voucher pendiente del Club en esta
// sucursal, mostramos este banner celebratorio con el código a mostrarle al
// mozo. Dismissable; no bloquea el resto de la pantalla.

import React from 'react';
import './VoucherBanner.css';

const VoucherBanner = ({ voucher, onDismiss }) => {
  if (!voucher) return null;

  return (
    <div className="voucher-banner" role="status">
      <button
        type="button"
        className="voucher-banner__close"
        onClick={onDismiss}
        aria-label="Cerrar"
      >
        ×
      </button>
      <div className="voucher-banner__icon">🎁</div>
      <p className="voucher-banner__title">¡Tenés un premio esperándote!</p>
      {voucher.reward && (
        <p className="voucher-banner__reward">{voucher.reward}</p>
      )}
      <p className="voucher-banner__hint">Mostrale este código al mozo:</p>
      <div className="voucher-banner__code">{voucher.code}</div>
    </div>
  );
};

export default VoucherBanner;
