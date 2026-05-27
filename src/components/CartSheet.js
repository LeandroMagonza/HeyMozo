// src/components/CartSheet.js
//
// Bottom sheet del carrito — reemplaza a CartPage (Sprint 5.1).
// Contiene TODO el flujo del cliente sin salir del menú:
//   • "Agregando ahora": items del carrito local con ±qty + remove
//   • "Notas para el mozo" (opcional)
//   • "Ya enviado a cocina": pedidos confirmados de la sesión (read-only)
//   • Total acumulado (carrito + ya pedido)
//   • CTA: "Confirmar Pedido ($X)" — visible solo si carrito>0. El cliente
//     cierra el sheet con la X del header o tocando el overlay (sin botón
//     redundante "Seguir eligiendo").
//
// Se abre tanto desde el icono carrito del header como desde el bottom bar
// sticky del MenuClient.

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import SessionOrdersList from './SessionOrdersList';
import { confirmOrder as apiConfirmOrder } from '../services/api';
import { bootstrapCustomerSession } from '../services/device';
import {
  cartItemCount,
  cartTotalCents,
  clearCart,
  decrementItem,
  incrementItem,
  readCart,
  removeItem,
  subscribeCart,
} from '../services/cart';
import './CartSheet.css';

const formatPrice = (cents) =>
  (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const CartSheet = ({
  open,
  onClose,
  companyId,
  branchId,
  tableId,
  pastOrders = [],
}) => {
  const navigate = useNavigate();

  const [cart, setCart] = useState(() => readCart(branchId, tableId));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    setCart(readCart(branchId, tableId));
  }, [branchId, tableId]);

  useEffect(() => {
    refresh();
    return subscribeCart(branchId, tableId, refresh);
  }, [branchId, tableId, refresh]);

  // ESC para cerrar.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset error al cerrar para que no quede colgado al re-abrir.
  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  if (!open) return null;

  const handleInc = (id) => incrementItem(branchId, tableId, id);
  const handleDec = (id) => decrementItem(branchId, tableId, id);
  const handleRemove = (id) => removeItem(branchId, tableId, id);

  const handleConfirm = async () => {
    if (cart.items.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      items: cart.items.map((i) => ({
        menuItemId: i.menuItemId,
        qty: i.qty,
        notes: i.notes || undefined,
      })),
      notes: notes.trim() || undefined,
    };

    try {
      let resp;
      try {
        resp = await apiConfirmOrder(tableId, payload);
      } catch (err) {
        const status = err && err.response && err.response.status;
        if (status === 401 || status === 403) {
          await bootstrapCustomerSession(tableId);
          resp = await apiConfirmOrder(tableId, payload);
        } else {
          throw err;
        }
      }
      const order = resp.data;
      clearCart(branchId, tableId);
      navigate(`/m/${companyId}/${branchId}/${tableId}/confirmado/${order.id}`);
    } catch (err) {
      console.error('Error confirmando pedido:', err);
      const msg = (err && err.response && err.response.data && err.response.data.error)
        || 'No se pudo confirmar el pedido. Reintentá.';
      setError(msg);
      setSubmitting(false);
    }
  };

  const cartTotal = cartTotalCents(cart);
  const cartCount = cartItemCount(cart);
  const pastTotal = pastOrders.reduce((s, o) => s + (o.totalCents || 0), 0);
  const grandTotal = cartTotal + pastTotal;
  const hasCart = cart.items.length > 0;
  const hasPast = pastOrders.length > 0;

  return (
    <div className="cart-sheet__overlay" onClick={onClose} role="presentation">
      <div
        className="cart-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
      >
        <div className="cart-sheet__handle" aria-hidden="true" />

        <div className="cart-sheet__header">
          <h2 className="cart-sheet__title">Mi Pedido</h2>
          {hasCart && (
            <span className="cart-sheet__pill">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
          )}
          <button
            type="button"
            className="cart-sheet__close rd-tap-scale"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="cart-sheet__body">
          {/* ── Sección: agregando ahora ───────────────────── */}
          {hasCart && (
            <section className="cart-sheet__section">
              <h3 className="cart-sheet__section-title cart-sheet__section-title--cart">
                <span className="material-symbols-outlined">shopping_cart</span>
                Agregando ahora
              </h3>
              <ul className="cart-sheet__items">
                {cart.items.map((it) => (
                  <li key={it.menuItemId} className="cart-sheet__item">
                    <div className="cart-sheet__item-info">
                      <h4 className="cart-sheet__item-name">{it.name}</h4>
                      <span className="cart-sheet__item-price">
                        {formatPrice(it.priceCents * it.qty)}
                      </span>
                    </div>
                    <div className="cart-sheet__qty">
                      <button
                        type="button"
                        className="cart-sheet__qty-btn rd-tap-scale"
                        onClick={() => (it.qty <= 1 ? handleRemove(it.menuItemId) : handleDec(it.menuItemId))}
                        aria-label="Restar"
                      >
                        <span className="material-symbols-outlined">
                          {it.qty <= 1 ? 'delete' : 'remove'}
                        </span>
                      </button>
                      <span className="cart-sheet__qty-value">{it.qty}</span>
                      <button
                        type="button"
                        className="cart-sheet__qty-btn rd-tap-scale"
                        onClick={() => handleInc(it.menuItemId)}
                        aria-label="Sumar"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <textarea
                className="cart-sheet__notes"
                placeholder="Notas para el mozo (sin sal, sin cebolla…)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 280))}
              />

              {error && <div className="cart-sheet__error">{error}</div>}
            </section>
          )}

          {/* ── Sección: ya enviado a cocina ──────────────── */}
          {hasPast && (
            <section className="cart-sheet__section">
              <h3 className="cart-sheet__section-title cart-sheet__section-title--past">
                <span className="material-symbols-outlined">check_circle</span>
                Ya enviado a cocina
              </h3>
              <SessionOrdersList orders={pastOrders} />
            </section>
          )}

          {/* ── Empty state ───────────────────────────────── */}
          {!hasCart && !hasPast && (
            <div className="cart-sheet__empty">
              <span className="material-symbols-outlined cart-sheet__empty-icon">shopping_bag</span>
              <p className="cart-sheet__empty-text">
                Todavía no agregaste nada al pedido.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer: total acumulado + CTA confirmar ─────── */}
        {(hasCart || hasPast) && (
          <div className="cart-sheet__footer">
            <div className="cart-sheet__total">
              <span className="cart-sheet__total-label">
                {hasCart && hasPast ? 'Total acumulado' : 'Total'}
              </span>
              <span className="cart-sheet__total-value">{formatPrice(grandTotal)}</span>
            </div>

            {hasCart && (
              <div className="cart-sheet__actions">
                <button
                  type="button"
                  className="cart-sheet__primary rd-tap-scale"
                  onClick={handleConfirm}
                  disabled={submitting}
                >
                  {submitting ? 'Enviando…' : `Confirmar Pedido (${formatPrice(cartTotal)})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartSheet;
