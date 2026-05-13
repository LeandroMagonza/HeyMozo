// src/components/AlertCard.js
//
// Card de alerta para la vista mozo del AdminScreen redesign.
// Reemplaza la fila de TablesList. Cada AlertCard es una mesa con alertas
// activas: header (nombre mesa + tiempo de espera), body (icono + título +
// subtitle), botón de acción ("Atender" / "LISTO" / "Liberar"), badge contador.
//
// El color/background sale de `variant`, que viene de EventType.cardVariant
// resuelto en AdminScreen. Las 6 variants son red/orange/yellow/paid/purple/blue.

import React from 'react';
import IconRenderer from '../services/iconRenderer';
import './AlertCard.css';

// Background por variant — replica los colores del mockup.
const VARIANT_BG = {
  red: '#d62d20',
  orange: '#f07020',
  yellow: '#f5c518',
  paid: '#30d158',
  purple: '#9333ea',
  blue: '#0a84ff',
};

// Variants con background claro necesitan texto oscuro (mejor contraste).
const LIGHT_VARIANTS = new Set(['yellow']);

const ScheduleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15.5 14" />
  </svg>
);

const AlertCard = ({
  tableName,
  variant = 'orange',
  title,
  subtitle,
  waitTime,
  icon,
  actionLabel = 'Atender',
  badgeCount,
  dimmed = false,
  disabledBtn = false,
  onClick,
  onActionClick,
}) => {
  const bg = VARIANT_BG[variant] ?? VARIANT_BG.orange;
  const isLight = LIGHT_VARIANTS.has(variant);

  const handleAction = (e) => {
    if (disabledBtn) return;
    e.stopPropagation();
    onActionClick?.();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={`alert-card alert-card--${variant} ${dimmed ? 'alert-card--dimmed' : ''} ${isLight ? 'alert-card--light' : ''}`}
      style={{ background: bg }}
      onClick={onClick}
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
    >
      {badgeCount != null && badgeCount > 0 && (
        <div className="alert-card__badge" aria-label={`${badgeCount} alertas`}>
          {badgeCount}
        </div>
      )}

      <div className="alert-card__inner">
        <div className="alert-card__header">
          <div className="alert-card__table-name">{tableName}</div>
          {waitTime && (
            <div className="alert-card__wait">
              <ScheduleIcon />
              <span>{waitTime}</span>
            </div>
          )}
        </div>

        <div className="alert-card__body">
          {icon && (
            <span className="alert-card__icon" aria-hidden="true">
              <IconRenderer iconName={icon} size="1.25rem" />
            </span>
          )}
          <span className="alert-card__title">{title}</span>
        </div>

        {subtitle && <div className="alert-card__subtitle">{subtitle}</div>}
      </div>

      <button
        type="button"
        className={`alert-card__action ${disabledBtn ? 'alert-card__action--disabled' : ''} ${variant === 'purple' && !disabledBtn ? 'alert-card__action--pill' : ''}`}
        onClick={handleAction}
        disabled={disabledBtn}
      >
        {actionLabel}
      </button>
    </div>
  );
};

export default AlertCard;
