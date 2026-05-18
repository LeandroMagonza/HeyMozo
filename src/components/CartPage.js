// src/components/CartPage.js
// Route: /m/:companyId/:branchId/:tableId/pedido
//
// Revisar carrito antes de confirmar. ±qty, eliminar, notas globales.
// Confirma → POST /api/tables/:tid/orders → navega a /confirmado/:orderId.

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Phone from './Phone';
import ClientPageHeader from './ClientPageHeader';
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
import './CartPage.css';

const formatPrice = (cents) => {
  const pesos = cents / 100;
  return pesos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
};

const CartPage = () => {
  const { companyId, branchId, tableId } = useParams();
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

  const handleBack = () => {
    navigate(`/m/${companyId}/${branchId}/${tableId}/menu`);
  };

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
        // Si la cookie de device se perdió (401) o no estamos adjuntos a la
        // sesión (403), re-bootstrappear y reintentar UNA vez.
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

  const total = cartTotalCents(cart);
  const count = cartItemCount(cart);

  return (
    <Phone className="cart-page">
      <ClientPageHeader title="Tu Pedido" onBack={handleBack} sticky />

      <main className="cart-page__main">
        {cart.items.length === 0 ? (
          <div className="cart-page__empty">
            <span className="material-symbols-outlined cart-page__empty-icon">shopping_bag</span>
            <p className="cart-page__empty-text">Todavía no agregaste nada al pedido.</p>
            <button
              type="button"
              className="cart-page__empty-cta rd-tap-scale"
              onClick={handleBack}
            >
              Ver menú
            </button>
          </div>
        ) : (
          <>
            <section className="cart-page__section">
              <h2 className="cart-page__section-title">Agregando ahora</h2>
              <ul className="cart-page__items">
                {cart.items.map((it) => (
                  <li key={it.menuItemId} className="cart-page__item">
                    <div className="cart-page__item-info">
                      <h3 className="cart-page__item-name">{it.name}</h3>
                      <span className="cart-page__item-price">
                        {formatPrice(it.priceCents * it.qty)}
                      </span>
                    </div>
                    <div className="cart-page__qty">
                      <button
                        type="button"
                        className="cart-page__qty-btn rd-tap-scale"
                        onClick={() => (it.qty <= 1 ? handleRemove(it.menuItemId) : handleDec(it.menuItemId))}
                        aria-label="Restar"
                      >
                        <span className="material-symbols-outlined">
                          {it.qty <= 1 ? 'delete' : 'remove'}
                        </span>
                      </button>
                      <span className="cart-page__qty-value">{it.qty}</span>
                      <button
                        type="button"
                        className="cart-page__qty-btn rd-tap-scale"
                        onClick={() => handleInc(it.menuItemId)}
                        aria-label="Sumar"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="cart-page__section">
              <h2 className="cart-page__section-title">Notas para el mozo (opcional)</h2>
              <textarea
                className="cart-page__notes"
                placeholder="Ej: sin sal, sin cebolla…"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 280))}
              />
            </section>

            {error && <div className="cart-page__error">{error}</div>}
          </>
        )}
      </main>

      {cart.items.length > 0 && (
        <div className="cart-page__footer">
          <div className="cart-page__total">
            <span className="cart-page__total-label">Total</span>
            <span className="cart-page__total-value">{formatPrice(total)}</span>
          </div>
          <button
            type="button"
            className="cart-page__confirm rd-tap-scale"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Enviando…' : `Confirmar Pedido (${count})`}
          </button>
        </div>
      )}
    </Phone>
  );
};

export default CartPage;
