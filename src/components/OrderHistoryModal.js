// src/components/OrderHistoryModal.js
// Historial de pedidos de la sesión activa del cliente.
// Abre desde UserScreen; datos se piden al montar (lazy).

import React, { useCallback, useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { getTableOrders } from '../services/api';
import './OrderHistoryModal.css';

const STATUS_LABEL = {
  pending: 'En marcha',
  ready: 'Listo',
  cancelled: 'Cancelado',
};

const STATUS_CLASS = {
  pending: 'ohm-status--pending',
  ready: 'ohm-status--ready',
  cancelled: 'ohm-status--cancelled',
};

const formatPrice = (cents) =>
  (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const OrderHistoryModal = ({ show, tableId, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!tableId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await getTableOrders(tableId);
      setOrders(data.orders || []);
    } catch (err) {
      const status = err && err.response && err.response.status;
      if (status === 401) {
        setOrders([]);
      } else {
        setError('No se pudo cargar el historial.');
      }
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    if (show) fetchOrders();
  }, [show, fetchOrders]);

  if (!show) return null;

  const grandTotal = orders.reduce((acc, o) => acc + (o.totalCents || 0), 0);

  return (
    <div className="ohm-overlay" onClick={onClose}>
      <div className="ohm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ohm-header">
          <h2 className="ohm-title">Mis pedidos</h2>
          <button type="button" className="ohm-close rd-tap-scale" onClick={onClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>

        <div className="ohm-body">
          {loading && (
            <div className="ohm-center">
              <div className="ohm-spinner" />
              <p className="ohm-hint">Cargando…</p>
            </div>
          )}

          {!loading && error && (
            <div className="ohm-center">
              <span className="material-symbols-outlined ohm-error-icon">error</span>
              <p className="ohm-hint">{error}</p>
              <button type="button" className="ohm-retry rd-tap-scale" onClick={fetchOrders}>
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="ohm-center">
              <span className="material-symbols-outlined ohm-empty-icon">receipt_long</span>
              <p className="ohm-hint">No hay pedidos en esta sesión.</p>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <>
              <ul className="ohm-list">
                {orders.map((order) => (
                  <li key={order.id} className="ohm-card">
                    <div className="ohm-card-header">
                      <span className={`ohm-status ${STATUS_CLASS[order.status] || ''}`}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                      <span className="ohm-card-time">{formatTime(order.createdAt)}</span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <ul className="ohm-items">
                        {order.items.map((it) => (
                          <li key={it.id} className="ohm-item">
                            <span className="ohm-item-qty">{it.qty}×</span>
                            <span className="ohm-item-name">{it.nameSnapshot}</span>
                            <span className="ohm-item-price">
                              {formatPrice(it.unitPriceCents * it.qty)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="ohm-card-total">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.totalCents)}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {orders.length > 1 && (
                <div className="ohm-grand-total">
                  <span>Total sesión</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryModal;
