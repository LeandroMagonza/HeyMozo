import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  getBranch,
  getCompany,
  updateBranch,
  disconnectBranchMp,
} from '../services/api';
import './PaymentConfig.css';
import { FaSave, FaArrowLeft, FaCreditCard, FaGripLines } from 'react-icons/fa';
import AdminHeader from './AdminHeader';

const METHOD_LABELS = {
  mp: 'Mercado Pago',
  transfer: 'Transferencia / MODO',
  modo: 'MODO (deeplink)',
  card: 'Tarjeta (posnet)',
  cash: 'Efectivo',
};

const DEFAULT_PRIORITY = ['mp', 'transfer', 'modo', 'card', 'cash'];

const buildMpOAuthUrl = (branchId, companyId) => {
  const appId = process.env.REACT_APP_MP_APP_ID;
  if (!appId) return null;
  const baseUrl = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace('/api', '')
    : 'http://localhost:3001';
  const redirectUri = `${baseUrl}/api/auth/mp/callback`;
  const state = `${branchId}:${companyId}`;
  return `https://auth.mercadopago.com/authorization?client_id=${appId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
};

const PaymentConfig = () => {
  const { companyId, branchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mpFlash, setMpFlash] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [companyRes, branchRes] = await Promise.all([
        getCompany(companyId),
        getBranch(branchId),
      ]);
      setCompany(companyRes.data);
      const b = branchRes.data;
      setForm({
        mpAccessToken: b.mpAccessToken || '',
        mpMarketplaceEnabled: !!b.mpMarketplaceEnabled,
        transferAlias: b.transferAlias || '',
        transferCbu: b.transferCbu || '',
        transferTitular: b.transferTitular || '',
        transferCuit: b.transferCuit || '',
        paymentMethodsEnabled: b.paymentMethodsEnabled || {
          mp: true, transfer: true, modo: true, card: true, cash: true,
        },
        paymentMethodPriority: b.paymentMethodPriority || [...DEFAULT_PRIORITY],
        googleMapsReviewUrl: b.googleMapsReviewUrl || '',
        clubReward: b.clubReward || 'Pinta Gratis',
        clubGoal: b.clubGoal ?? 5,
        clubAccelerationAtVisit: b.clubAccelerationAtVisit ?? '',
        clubAccelerationMultiplier: b.clubAccelerationMultiplier ?? 2,
        clubVisitCooldownHours: b.clubVisitCooldownHours ?? 12,
      });
      setLoading(false);
    } catch (err) {
      console.error('Error loading payment config:', err);
      setLoading(false);
    }
  }, [companyId, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const mpResult = searchParams.get('mp');
    if (mpResult === 'success') setMpFlash('success');
    else if (mpResult === 'error') setMpFlash('error');
  }, [searchParams]);

  const handleField = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleToggleMethod = (method) =>
    setForm(prev => ({
      ...prev,
      paymentMethodsEnabled: {
        ...prev.paymentMethodsEnabled,
        [method]: !prev.paymentMethodsEnabled[method],
      },
    }));

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(form.paymentMethodPriority);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setForm(prev => ({ ...prev, paymentMethodPriority: items }));
  };

  const handleSave = async () => {
    if (!window.confirm('¿Guardar los cambios de configuración de pagos?')) return;
    setSaving(true);
    try {
      const payload = {
        mpMarketplaceEnabled: form.mpMarketplaceEnabled,
        transferAlias: form.transferAlias || null,
        transferCbu: form.transferCbu || null,
        transferTitular: form.transferTitular || null,
        transferCuit: form.transferCuit || null,
        paymentMethodsEnabled: form.paymentMethodsEnabled,
        paymentMethodPriority: form.paymentMethodPriority,
        googleMapsReviewUrl: form.googleMapsReviewUrl || null,
        clubReward: form.clubReward || 'Premio',
        clubGoal: parseInt(form.clubGoal) || 5,
        clubAccelerationAtVisit: form.clubAccelerationAtVisit !== '' ? parseInt(form.clubAccelerationAtVisit) : null,
        clubAccelerationMultiplier: parseInt(form.clubAccelerationMultiplier) || 2,
        clubVisitCooldownHours: form.clubVisitCooldownHours !== '' ? parseInt(form.clubVisitCooldownHours) : 12,
      };
      await updateBranch(branchId, payload);
      alert('Configuración guardada correctamente');
    } catch (err) {
      console.error('Error saving payment config:', err);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectMp = async () => {
    if (!window.confirm('¿Desconectar Mercado Pago de esta sucursal?')) return;
    try {
      await disconnectBranchMp(branchId);
      setForm(prev => ({ ...prev, mpAccessToken: '' }));
      alert('Mercado Pago desconectado');
    } catch (err) {
      console.error('Error disconnecting MP:', err);
      alert('Error al desconectar Mercado Pago');
    }
  };

  const handleConnectMp = () => {
    const url = buildMpOAuthUrl(branchId, companyId);
    if (!url) {
      alert('MP_APP_ID no configurado. Agregá REACT_APP_MP_APP_ID al .env.');
      return;
    }
    window.location.href = url;
  };

  if (loading) return <div className="loading">Cargando...</div>;

  const mpConnected = !!form.mpAccessToken;
  const mpOAuthAvailable = !!process.env.REACT_APP_MP_APP_ID;

  return (
    <div className="admin-container">
      <AdminHeader
        title={`Configuración de Pagos — ${company?.name || ''}`}
        showBackButton
        backUrl={`/config/${companyId}/${branchId}`}
      />
      <div className="admin-content">
        <div className="payment-config">

          {/* ========== Mercado Pago ========== */}
          <section className="pc-section">
            <h2 className="pc-section__title">
              <FaCreditCard className="pc-section__icon" />
              Mercado Pago
            </h2>

            {mpFlash === 'success' && (
              <div className="pc-flash pc-flash--success">
                ✅ Mercado Pago conectado correctamente
              </div>
            )}
            {mpFlash === 'error' && (
              <div className="pc-flash pc-flash--error">
                ❌ Error al conectar Mercado Pago. Intentá nuevamente.
              </div>
            )}

            <div className="pc-mp-status">
              <span className={`pc-mp-badge ${mpConnected ? 'pc-mp-badge--ok' : 'pc-mp-badge--no'}`}>
                {mpConnected ? '● Conectado' : '○ No conectado'}
              </span>
              {mpConnected && (
                <span className="pc-mp-token-hint">
                  Token: …{form.mpAccessToken.slice(-8)}
                </span>
              )}
            </div>

            {mpConnected ? (
              <button className="app-button danger pc-btn-sm" onClick={handleDisconnectMp}>
                Desconectar MP
              </button>
            ) : (
              <button
                className="app-button primary pc-btn-sm"
                onClick={handleConnectMp}
                disabled={!mpOAuthAvailable}
                title={mpOAuthAvailable ? undefined : 'REACT_APP_MP_APP_ID no configurado'}
              >
                Conectar con Mercado Pago
              </button>
            )}

            <div className="pc-field pc-field--toggle pc-mt">
              <label className="pc-toggle">
                <input
                  type="checkbox"
                  checked={form.mpMarketplaceEnabled}
                  onChange={(e) => handleField('mpMarketplaceEnabled', e.target.checked)}
                />
                <span className="pc-toggle__track" />
                <span className="pc-toggle__label">
                  Marketplace MP activado
                  <span className="pc-note"> — habilita split automático propina → mozo</span>
                </span>
              </label>
            </div>
            {!form.mpMarketplaceEnabled && (
              <p className="pc-hint">
                Sin Marketplace, la propina vía MP se muestra al cliente como "Propina pendiente" (cash/transfer al mozo). Para activarlo, completá el trámite en el portal de MP.
              </p>
            )}
          </section>

          {/* ========== Transferencia / MODO ========== */}
          <section className="pc-section">
            <h2 className="pc-section__title">Transferencia / MODO</h2>
            <div className="pc-grid-2">
              <div className="pc-field">
                <label>Alias</label>
                <input
                  type="text"
                  value={form.transferAlias}
                  onChange={(e) => handleField('transferAlias', e.target.value)}
                  placeholder="mi.alias.mp"
                />
              </div>
              <div className="pc-field">
                <label>CBU / CVU</label>
                <input
                  type="text"
                  value={form.transferCbu}
                  onChange={(e) => handleField('transferCbu', e.target.value)}
                  placeholder="0000000000000000000000"
                />
              </div>
              <div className="pc-field">
                <label>Titular de la cuenta</label>
                <input
                  type="text"
                  value={form.transferTitular}
                  onChange={(e) => handleField('transferTitular', e.target.value)}
                  placeholder="Nombre del titular"
                />
              </div>
              <div className="pc-field">
                <label>CUIT / CUIL</label>
                <input
                  type="text"
                  value={form.transferCuit}
                  onChange={(e) => handleField('transferCuit', e.target.value)}
                  placeholder="20-00000000-0"
                />
              </div>
            </div>
          </section>

          {/* ========== Métodos habilitados ========== */}
          <section className="pc-section">
            <h2 className="pc-section__title">Métodos habilitados</h2>
            <div className="pc-methods-grid">
              {DEFAULT_PRIORITY.map((method) => (
                <label key={method} className="pc-toggle pc-toggle--method">
                  <input
                    type="checkbox"
                    checked={!!form.paymentMethodsEnabled[method]}
                    onChange={() => handleToggleMethod(method)}
                  />
                  <span className="pc-toggle__track" />
                  <span className="pc-toggle__label">{METHOD_LABELS[method]}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ========== Prioridad (drag-drop) ========== */}
          <section className="pc-section">
            <h2 className="pc-section__title">
              Prioridad de métodos
              <span className="pc-note"> — el primero se destaca como opción recomendada</span>
            </h2>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="priority">
                {(provided) => (
                  <ul
                    className="pc-priority-list"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {form.paymentMethodPriority.map((method, index) => (
                      <Draggable key={method} draggableId={method} index={index}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`pc-priority-item${snapshot.isDragging ? ' pc-priority-item--dragging' : ''}`}
                          >
                            <FaGripLines className="pc-grip" />
                            <span className="pc-priority-num">{index + 1}</span>
                            <span>{METHOD_LABELS[method]}</span>
                            {!form.paymentMethodsEnabled[method] && (
                              <span className="pc-disabled-badge">deshabilitado</span>
                            )}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </section>

          {/* ========== Reviews ========== */}
          <section className="pc-section">
            <h2 className="pc-section__title">Reviews</h2>
            <div className="pc-field">
              <label>URL de reseña en Google Maps</label>
              <input
                type="text"
                value={form.googleMapsReviewUrl}
                onChange={(e) => handleField('googleMapsReviewUrl', e.target.value)}
                placeholder="https://g.page/r/xxxx/review"
              />
              <p className="pc-hint">
                Aparece siempre al final del flow de pago, independientemente de la calificación del cliente.
              </p>
            </div>
          </section>

          {/* ========== Club VIP ========== */}
          <section className="pc-section">
            <h2 className="pc-section__title">Club VIP</h2>
            <div className="pc-grid-2">
              <div className="pc-field pc-field--wide">
                <label>Premio al completar el objetivo</label>
                <input
                  type="text"
                  value={form.clubReward}
                  onChange={(e) => handleField('clubReward', e.target.value)}
                  placeholder="Pinta Gratis"
                />
              </div>
              <div className="pc-field">
                <label>Visitas para el premio</label>
                <input
                  type="number"
                  min="1"
                  value={form.clubGoal}
                  onChange={(e) => handleField('clubGoal', e.target.value)}
                />
              </div>
            </div>
            <div className="pc-grid-2 pc-mt">
              <div className="pc-field">
                <label>
                  Visita de aceleración
                  <span className="pc-note"> (opcional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.clubAccelerationAtVisit}
                  onChange={(e) => handleField('clubAccelerationAtVisit', e.target.value)}
                  placeholder="ej: 3"
                />
                <p className="pc-hint">
                  En esta visita se suman N puntos en lugar de 1 (endowed progress).
                </p>
              </div>
              <div className="pc-field">
                <label>Multiplicador de aceleración</label>
                <input
                  type="number"
                  min="1"
                  value={form.clubAccelerationMultiplier}
                  onChange={(e) => handleField('clubAccelerationMultiplier', e.target.value)}
                />
              </div>
            </div>
            <div className="pc-grid-2 pc-mt">
              <div className="pc-field">
                <label>Cooldown entre visitas (horas)</label>
                <input
                  type="number"
                  min="0"
                  value={form.clubVisitCooldownHours}
                  onChange={(e) => handleField('clubVisitCooldownHours', e.target.value)}
                  placeholder="12"
                />
                <p className="pc-hint">
                  No vuelve a contar una visita del mismo cliente dentro de este lapso.
                  12 = 1 por día aprox. · 4-6 = cuenta almuerzo y cena · 24 = 1 por día estricto.
                </p>
              </div>
            </div>
          </section>

          {/* ========== Guardar ========== */}
          <div className="pc-save-row">
            <button
              className="app-button success"
              onClick={handleSave}
              disabled={saving}
            >
              <FaSave /> {saving ? 'Guardando…' : 'Guardar Cambios'}
            </button>
            <button
              className="app-button"
              onClick={() => navigate(`/config/${companyId}/${branchId}`)}
            >
              <FaArrowLeft /> Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfig;
