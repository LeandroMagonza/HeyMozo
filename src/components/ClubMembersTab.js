// src/components/ClubMembersTab.js
//
// Tab "Club" de la CajaShell (Sprint 5.10 + vouchers 5.11). Lista los socios del
// Club VIP del branch con filtros client-side (búsqueda por teléfono, días sin
// volver, voucher pendiente) y envío de WhatsApp — individual o masivo — vía
// links `wa.me/...`.
//
// Sprint 5.11: los socios que alcanzaron el goal tienen un Voucher generado
// (código + premio). Para esos socios el mensaje usa una plantilla distinta que
// incluye el código de canje ({codigo}). El socio puede mostrar ese código al
// mozo, o esperar a que HeyMozo lo detecte solo en su próxima visita.
//
// Sobre el "masivo": wa.me abre un chat por vez y los navegadores bloquean
// abrir N pestañas en un solo gesto. Por eso el envío masivo es una COLA: al
// iniciar abre el primer chat y deja un control "Abrir siguiente" para ir uno
// por uno (cada apertura es un click del usuario → no la bloquea el navegador).
// El upgrade a envío server-side real (WhatsApp Business API) queda post-MVP.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { FaWhatsapp, FaCrown, FaSearch, FaSyncAlt, FaGift } from 'react-icons/fa';
import { getClubMembers } from '../services/api';
import './ClubMembersTab.css';

const DEFAULT_TEMPLATE =
  '¡Hola! 👋 En {sucursal} ya sumás {visitas} de {meta} visitas del Club. ' +
  '¡Te esperamos para tu {premio}! 🎉';

// Plantilla para socios que ya tienen un voucher generado. Incluye el código.
const DEFAULT_VOUCHER_TEMPLATE =
  '¡Hola! 🎁 ¡Ganaste tu {premio} en {sucursal}! ' +
  'Mostrá este código cuando vengas: {codigo}';

const INACTIVE_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 7, label: '+7 días' },
  { value: 14, label: '+14 días' },
  { value: 30, label: '+30 días' },
];

function daysSince(ts) {
  if (!ts) return Infinity;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
}

function formatLastVisit(ts) {
  if (!ts) return 'sin visitas';
  const d = daysSince(ts);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  const months = Math.floor(d / 30);
  return months === 1 ? 'hace 1 mes' : `hace ${months} meses`;
}

// El teléfono se guarda ya normalizado a dígitos (club.js _normalizePhone).
// Lo mostramos crudo; wa.me lo consume tal cual. Si el socio tiene un voucher
// pendiente usamos la plantilla de voucher (con {codigo} + premio snapshot);
// si no, la plantilla regular de progreso.
function buildMessage(member, data, templates) {
  const useVoucher = member.hasPendingVoucher;
  const tpl = useVoucher ? templates.voucher : templates.regular;
  const premio = (useVoucher ? member.voucherReward : data.reward) || 'premio';
  return tpl
    .replace(/{sucursal}/g, data.branchName || 'nuestro local')
    .replace(/{visitas}/g, String(member.visits))
    .replace(/{meta}/g, data.goal != null ? String(data.goal) : '')
    .replace(/{premio}/g, premio)
    .replace(/{codigo}/g, member.voucherCode || '');
}

function waLink(member, data, templates) {
  const text = encodeURIComponent(buildMessage(member, data, templates));
  return `https://wa.me/${member.phone}?text=${text}`;
}

const ClubMembersTab = ({ branchId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [inactiveDays, setInactiveDays] = useState(0);
  const [onlyPendingVoucher, setOnlyPendingVoucher] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [voucherTemplate, setVoucherTemplate] = useState(DEFAULT_VOUCHER_TEMPLATE);

  // Cola de envío masivo: lista snapshot de los filtrados + índice del actual.
  const [waQueue, setWaQueue] = useState(null);
  const [waIndex, setWaIndex] = useState(0);

  const templates = useMemo(
    () => ({ regular: template, voucher: voucherTemplate }),
    [template, voucherTemplate]
  );

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClubMembers(branchId);
      setData(res.data);
    } catch (err) {
      console.error('👑 ClubMembersTab — error cargando socios:', err);
      setError(err?.response?.data?.error || 'No se pudieron cargar los socios.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const members = useMemo(() => data?.members || [], [data]);
  const voucherCount = useMemo(
    () => members.filter((m) => m.hasPendingVoucher).length,
    [members]
  );

  const filtered = useMemo(() => {
    const digits = search.replace(/[^\d]/g, '');
    return members.filter((m) => {
      if (digits && !m.phone.includes(digits)) return false;
      if (onlyPendingVoucher && !m.hasPendingVoucher) return false;
      if (inactiveDays > 0 && daysSince(m.lastVisitAt) < inactiveDays) return false;
      return true;
    });
  }, [members, search, inactiveDays, onlyPendingVoucher]);

  const startBulk = useCallback(() => {
    if (filtered.length === 0) return;
    setWaQueue(filtered);
    setWaIndex(0);
    window.open(waLink(filtered[0], data, templates), '_blank', 'noopener');
  }, [filtered, data, templates]);

  const openNext = useCallback(() => {
    if (!waQueue) return;
    const next = waIndex + 1;
    if (next < waQueue.length) {
      window.open(waLink(waQueue[next], data, templates), '_blank', 'noopener');
      setWaIndex(next);
    }
  }, [waQueue, waIndex, data, templates]);

  const closeBulk = useCallback(() => {
    setWaQueue(null);
    setWaIndex(0);
  }, []);

  if (loading) {
    return (
      <div className="caja-shell__empty">
        <p className="caja-shell__empty-text">Cargando socios…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="caja-shell__empty">
        <FaCrown className="caja-shell__empty-icon" />
        <p className="caja-shell__empty-title">No se pudo cargar el Club</p>
        <p className="caja-shell__empty-desc">{error}</p>
        <button className="club-tab__retry" onClick={fetchMembers}>
          <FaSyncAlt /> Reintentar
        </button>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="caja-shell__empty">
        <FaCrown className="caja-shell__empty-icon" />
        <p className="caja-shell__empty-title">Todavía no hay socios</p>
        <p className="caja-shell__empty-desc">
          Cuando los clientes se sumen al Club desde la pantalla de pago,
          aparecerán acá para que les escribas por WhatsApp.
        </p>
      </div>
    );
  }

  const bulkActive = waQueue !== null;
  const bulkDone = bulkActive && waIndex >= waQueue.length - 1;
  // ¿Hay algún socio con voucher en el set filtrado? Si sí, mostramos la
  // plantilla de voucher (sino solo la regular, para no saturar).
  const filteredHasVoucher = filtered.some((m) => m.hasPendingVoucher);

  return (
    <div className="club-tab">
      {/* Filtros + mensaje */}
      <div className="club-tab__toolbar">
        <div className="club-tab__search">
          <FaSearch className="club-tab__search-icon" />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Buscar por teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="club-tab__chips">
          {INACTIVE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`club-tab__chip${inactiveDays === opt.value ? ' club-tab__chip--active' : ''}`}
              onClick={() => setInactiveDays(opt.value)}
              title={opt.value === 0 ? 'Sin filtro de inactividad' : `Sin volver hace ${opt.label}`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className={`club-tab__chip${onlyPendingVoucher ? ' club-tab__chip--active' : ''}`}
            onClick={() => setOnlyPendingVoucher((v) => !v)}
            title="Solo socios con un voucher pendiente de canjear"
          >
            <FaGift /> Voucher pendiente
            {voucherCount > 0 && <span className="club-tab__chip-count">{voucherCount}</span>}
          </button>
        </div>
      </div>

      <div className="club-tab__message">
        <label className="club-tab__message-label">
          Mensaje de WhatsApp
          <span className="club-tab__message-hint">
            Variables: {'{sucursal}'} · {'{visitas}'} · {'{meta}'} · {'{premio}'}
          </span>
        </label>
        <textarea
          className="club-tab__message-input"
          rows={2}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </div>

      {filteredHasVoucher && (
        <div className="club-tab__message club-tab__message--voucher">
          <label className="club-tab__message-label">
            <FaGift className="club-tab__message-gift" /> Mensaje para socios con voucher
            <span className="club-tab__message-hint">
              Variables: {'{sucursal}'} · {'{premio}'} · {'{codigo}'}
            </span>
          </label>
          <textarea
            className="club-tab__message-input"
            rows={2}
            value={voucherTemplate}
            onChange={(e) => setVoucherTemplate(e.target.value)}
          />
        </div>
      )}

      {/* Header del listado + acción masiva */}
      <div className="club-tab__list-header">
        <span className="club-tab__count">
          {filtered.length} {filtered.length === 1 ? 'socio' : 'socios'}
          {filtered.length !== members.length && ` de ${members.length}`}
        </span>
        <button
          type="button"
          className="club-tab__bulk"
          onClick={startBulk}
          disabled={filtered.length === 0 || bulkActive}
        >
          <FaWhatsapp /> {filtered.length === 1 ? 'Enviar a 1 socio' : `Enviar a los ${filtered.length}`}
        </button>
      </div>

      {/* Cola de envío masivo */}
      {bulkActive && (
        <div className="club-tab__bulk-bar">
          <span className="club-tab__bulk-progress">
            WhatsApp {waIndex + 1} de {waQueue.length} abierto
            {' · '}
            <strong>{waQueue[waIndex]?.phone}</strong>
          </span>
          <div className="club-tab__bulk-actions">
            {!bulkDone ? (
              <button type="button" className="club-tab__bulk-next" onClick={openNext}>
                Abrir siguiente ({waIndex + 2}/{waQueue.length})
              </button>
            ) : (
              <span className="club-tab__bulk-finished">¡Listo, los recorriste todos!</span>
            )}
            <button type="button" className="club-tab__bulk-close" onClick={closeBulk}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="club-tab__list">
        {filtered.length === 0 ? (
          <p className="club-tab__no-match">Ningún socio coincide con los filtros.</p>
        ) : (
          filtered.map((m) => {
            const pct = data.goal ? Math.min(100, Math.round((m.visits / data.goal) * 100)) : 0;
            return (
              <div key={m.id} className="club-tab__row">
                <div className="club-tab__row-main">
                  <span className="club-tab__phone">{m.phone}</span>
                  {m.hasPendingVoucher ? (
                    <span className="club-tab__voucher-badge">
                      <FaGift /> Premio listo · <strong>{m.voucherCode}</strong>
                    </span>
                  ) : (
                    <span className="club-tab__last">Última visita: {formatLastVisit(m.lastVisitAt)}</span>
                  )}
                </div>

                <div className="club-tab__progress">
                  <div className="club-tab__progress-track">
                    <div
                      className={`club-tab__progress-fill${m.reachedGoal ? ' club-tab__progress-fill--done' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`club-tab__visits${m.reachedGoal ? ' club-tab__visits--done' : ''}`}>
                    {m.visits}{data.goal != null ? ` / ${data.goal}` : ''}
                    {m.reachedGoal && <FaCrown className="club-tab__visits-crown" />}
                  </span>
                </div>

                <a
                  className="club-tab__wa"
                  href={waLink(m, data, templates)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp /> WhatsApp
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ClubMembersTab;
