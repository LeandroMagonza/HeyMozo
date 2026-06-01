// src/components/ActiveTablesList.js
//
// Lista de mesas activas con balance + botón "Liberar" (Sprint 5.8).
// Compartido entre CajaShell (cajero/owner) y OpShell (mozo) — los dos
// muestran las sesiones activas con consumo para poder liberarlas a mano
// (walkout, cobro off-system, comp). Estilo neutro para que funcione sobre
// ambos fondos oscuros.
//
// Props:
//   sessions  — [{ sessionId, tableId, tableName, openedAt, balanceCents, ... }]
//   onRelease — (session) => void, abre el modal de confirmación del caller.

import React from 'react';
import './ActiveTablesList.css';

function formatPrice(cents) {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

function formatAgo(ts) {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs} h`;
}

const ActiveTablesList = ({ sessions, onRelease }) => (
  <div className="active-tables">
    {sessions.map((s) => (
      <div key={s.sessionId} className="active-tables__row">
        <div className="active-tables__info">
          <span className="active-tables__table">{s.tableName ?? `Mesa ${s.tableId}`}</span>
          <span className="active-tables__opened">Abierta {formatAgo(s.openedAt)}</span>
        </div>
        <div className="active-tables__balance">
          {s.balanceCents > 0 ? (
            <span className="active-tables__due">Debe {formatPrice(s.balanceCents)}</span>
          ) : (
            <span className="active-tables__paid">Pagado</span>
          )}
        </div>
        <button className="active-tables__release" onClick={() => onRelease(s)}>
          Liberar
        </button>
      </div>
    ))}
  </div>
);

export default ActiveTablesList;
