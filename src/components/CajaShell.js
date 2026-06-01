import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FaCashRegister, FaSignOutAlt, FaUser, FaReceipt, FaChair, FaCrown } from 'react-icons/fa';
import authService from '../services/authService';
import {
  getPaymentActions,
  acknowledgePayment,
  validatePayment,
  rejectPayment,
  getActiveSessions,
  releaseTable,
} from '../services/api';
import PaymentActionCard from './PaymentActionCard';
import ActiveTablesList from './ActiveTablesList';
import ReleaseTableModal from './ReleaseTableModal';
import ClubMembersTab from './ClubMembersTab';
import notificationSound from '../sounds/notification.mp3';
import './CajaShell.css';

const REFRESH_INTERVAL = 6000;

const CajaShell = () => {
  const { branchId } = useParams();
  const currentUser = authService.getCurrentUser();

  const [activeTab, setActiveTab] = useState('acciones');
  const [actions, setActions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [processingId, setProcessingId] = useState(null);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const audioRef = useRef(new Audio(notificationSound));
  const prevAwaitingRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [actionsRes, sessionsRes] = await Promise.all([
        getPaymentActions(branchId),
        getActiveSessions(branchId),
      ]);
      setActions(actionsRes.data);
      setSessions(sessionsRes.data);
    } catch (err) {
      console.error('💰 CajaShell — error fetching data:', err);
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL / 1000);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : REFRESH_INTERVAL / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const awaiting = useMemo(
    () => actions.filter(a => a.status === 'awaiting_validation'),
    [actions]
  );
  const acuses = useMemo(
    () => actions.filter(a => a.status !== 'awaiting_validation'),
    [actions]
  );

  // Sonido cuando entra una nueva transferencia a validar (no en el mount).
  useEffect(() => {
    const count = awaiting.length;
    if (prevAwaitingRef.current !== null && count > prevAwaitingRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    prevAwaitingRef.current = count;
  }, [awaiting.length]);

  const runPaymentAction = useCallback(async (id, fn) => {
    setProcessingId(id);
    try {
      await fn(id);
      await fetchData();
    } catch (err) {
      console.error('💰 CajaShell — error en acción de pago:', err);
      alert(err?.response?.data?.error || 'No se pudo completar la acción. Reintentá.');
    } finally {
      setProcessingId(null);
    }
  }, [fetchData]);

  const handleValidate = useCallback((id) => runPaymentAction(id, validatePayment), [runPaymentAction]);
  const handleReject = useCallback((id) => runPaymentAction(id, rejectPayment), [runPaymentAction]);
  const handleAcknowledge = useCallback((id) => runPaymentAction(id, acknowledgePayment), [runPaymentAction]);

  const handleConfirmRelease = useCallback(async (reason) => {
    if (!releaseTarget) return;
    setReleaseLoading(true);
    try {
      await releaseTable(releaseTarget.tableId, { releaseReason: reason });
      setReleaseTarget(null);
      await fetchData();
    } catch (err) {
      console.error('💰 CajaShell — error liberando mesa:', err);
      alert(err?.response?.data?.error || 'No se pudo liberar la mesa. Reintentá.');
    } finally {
      setReleaseLoading(false);
    }
  }, [releaseTarget, fetchData]);

  const handleLogout = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      authService.logout();
    }
  };

  const tabTitle = activeTab === 'acciones'
    ? 'Acciones'
    : activeTab === 'mesas'
      ? 'Mesas activas'
      : 'Club VIP';

  return (
    <div className="caja-shell">
      <aside className="caja-shell__sidebar">
        <div className="caja-shell__brand">
          <span className="caja-shell__brand-name">HeyMozo</span>
          <span className="caja-shell__brand-role">Caja</span>
        </div>

        <nav className="caja-shell__nav">
          <button
            type="button"
            className={`caja-shell__nav-item${activeTab === 'acciones' ? ' caja-shell__nav-item--active' : ''}`}
            onClick={() => setActiveTab('acciones')}
          >
            <FaReceipt className="caja-shell__nav-icon" />
            <span>Acciones</span>
            {awaiting.length > 0 && (
              <span className="caja-shell__nav-badge">{awaiting.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`caja-shell__nav-item${activeTab === 'mesas' ? ' caja-shell__nav-item--active' : ''}`}
            onClick={() => setActiveTab('mesas')}
          >
            <FaChair className="caja-shell__nav-icon" />
            <span>Mesas activas</span>
            {sessions.length > 0 && (
              <span className="caja-shell__nav-badge caja-shell__nav-badge--muted">{sessions.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`caja-shell__nav-item${activeTab === 'club' ? ' caja-shell__nav-item--active' : ''}`}
            onClick={() => setActiveTab('club')}
          >
            <FaCrown className="caja-shell__nav-icon" />
            <span>Club VIP</span>
          </button>
        </nav>

        <div className="caja-shell__footer">
          {currentUser && (
            <>
              <div className="caja-shell__user">
                <FaUser className="caja-shell__user-icon" />
                <span className="caja-shell__user-email">{currentUser.email}</span>
              </div>
              <button className="caja-shell__logout" onClick={handleLogout}>
                <FaSignOutAlt />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="caja-shell__main">
        <header className="caja-shell__topnav">
          <h1 className="caja-shell__topnav-title">{tabTitle}</h1>
          {activeTab !== 'club' && (
            <span className="caja-shell__countdown">Actualiza en {countdown}s</span>
          )}
        </header>

        <div className="caja-shell__content">
          {activeTab === 'club' ? (
            <ClubMembersTab branchId={branchId} />
          ) : loading ? (
            <div className="caja-shell__empty">
              <p className="caja-shell__empty-text">Cargando…</p>
            </div>
          ) : activeTab === 'acciones' ? (
            actions.length === 0 ? (
              <div className="caja-shell__empty">
                <FaCashRegister className="caja-shell__empty-icon" />
                <p className="caja-shell__empty-title">Sin acciones pendientes</p>
                <p className="caja-shell__empty-desc">
                  Las transferencias a validar y los pagos confirmados aparecerán acá.
                </p>
              </div>
            ) : (
              <>
                {awaiting.length > 0 && (
                  <section className="caja-shell__section">
                    <h2 className="caja-shell__section-title">A validar</h2>
                    <div className="caja-shell__grid">
                      {awaiting.map((p) => (
                        <PaymentActionCard
                          key={p.id}
                          payment={p}
                          busy={processingId === p.id}
                          onValidate={handleValidate}
                          onReject={handleReject}
                          onAcknowledge={handleAcknowledge}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {acuses.length > 0 && (
                  <section className="caja-shell__section">
                    <h2 className="caja-shell__section-title">Pagos confirmados</h2>
                    <div className="caja-shell__grid">
                      {acuses.map((p) => (
                        <PaymentActionCard
                          key={p.id}
                          payment={p}
                          busy={processingId === p.id}
                          onValidate={handleValidate}
                          onReject={handleReject}
                          onAcknowledge={handleAcknowledge}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )
          ) : (
            sessions.length === 0 ? (
              <div className="caja-shell__empty">
                <FaChair className="caja-shell__empty-icon" />
                <p className="caja-shell__empty-title">No hay mesas activas</p>
                <p className="caja-shell__empty-desc">
                  Las mesas con sesión abierta aparecerán acá para liberarlas si hace falta.
                </p>
              </div>
            ) : (
              <ActiveTablesList
                sessions={sessions}
                onRelease={(s) => setReleaseTarget({
                  tableId: s.tableId,
                  tableName: s.tableName ?? `Mesa ${s.tableId}`,
                  balanceCents: s.balanceCents,
                })}
              />
            )
          )}
        </div>
      </main>

      {releaseTarget && (
        <ReleaseTableModal
          tableName={releaseTarget.tableName}
          balanceCents={releaseTarget.balanceCents}
          onClose={() => setReleaseTarget(null)}
          onConfirm={handleConfirmRelease}
          loading={releaseLoading}
        />
      )}
    </div>
  );
};

export default CajaShell;
