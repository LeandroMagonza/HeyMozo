import React from 'react';
import './ClientPageHeader.css';

// Unified header for redesigned /user/* (cliente) screens.
//
// Props:
//   - title:     string mostrado al centro
//   - onBack:    si se pasa, muestra flecha de volver a la izquierda
//   - rightSlot: nodo React renderizado a la derecha (settings dropdown, etc.)
//   - sticky:    si true, el header queda sticky en top: 0
//   - variant:   'cliente' (default) | 'cajero' — cambia el bg sticky
const ClientPageHeader = ({
  title,
  onBack,
  rightSlot,
  sticky = false,
  variant = 'cliente',
}) => {
  const classes = [
    'client-page-header',
    `client-page-header--${variant}`,
    sticky ? 'client-page-header--sticky' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={classes}>
      {onBack ? (
        <button
          type="button"
          className="client-page-header__back rd-tap-scale"
          onClick={onBack}
          aria-label="Volver"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      ) : (
        <span className="client-page-header__back-placeholder" aria-hidden="true" />
      )}

      <h1 className="client-page-header__title">{title}</h1>

      <div className="client-page-header__right">
        {rightSlot || <span className="client-page-header__right-placeholder" aria-hidden="true" />}
      </div>
    </header>
  );
};

export default ClientPageHeader;
