import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTables, getCategories, staffAddOrder } from '../services/api';
import './AddOrderModal.css';

function formatPrice(cents) {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

const AddOrderModal = ({ branchId, onClose, onSuccess }) => {
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [cart, setCart] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(null);

  const menuRef = useRef(null);
  const categoryRefs = useRef({});

  useEffect(() => {
    Promise.all([getTables(branchId), getCategories(branchId)])
      .then(([tablesRes, catsRes]) => {
        const cats = catsRes.data || [];
        setTables(tablesRes.data || []);
        setCategories(cats);
        const firstVisible = cats.find(c => c.items?.some(i => i.isAvailable));
        if (firstVisible) setActiveTab(firstVisible.id);
      })
      .catch(() => setError('Error cargando datos del menú'));
  }, [branchId]);

  const menuItemMap = useMemo(() => {
    const map = {};
    for (const cat of categories) {
      for (const item of cat.items || []) map[item.id] = item;
    }
    return map;
  }, [categories]);

  const setQty = (menuItemId, delta) => {
    setCart(prev => {
      const next = Math.max(0, (prev[menuItemId] || 0) + delta);
      if (next === 0) {
        const { [menuItemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuItemId]: next };
    });
  };

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ menuItemId: parseInt(id), qty }));

  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);
  const totalCents = cartItems.reduce((s, i) => {
    const mi = menuItemMap[i.menuItemId];
    return s + (mi ? mi.priceCents * i.qty : 0);
  }, 0);

  const term = search.trim().toLowerCase();

  const visibleCategories = useMemo(() => {
    return categories
      .map(cat => ({
        ...cat,
        filteredItems: (cat.items || []).filter(
          i => i.isAvailable && (!term || i.name.toLowerCase().includes(term))
        ),
      }))
      .filter(cat => cat.filteredItems.length > 0);
  }, [categories, term]);

  const scrollToCategory = (catId) => {
    setSearch('');
    setActiveTab(catId);
    const el = categoryRefs.current[catId];
    const container = menuRef.current;
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    }
  };

  const tabCategories = useMemo(
    () => categories.filter(c => c.items?.some(i => i.isAvailable)),
    [categories]
  );

  const handleSubmit = async () => {
    if (!selectedTableId || cartItems.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await staffAddOrder({
        tableId: parseInt(selectedTableId),
        items: cartItems,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el pedido');
      setSubmitting(false);
    }
  };

  const canSubmit = selectedTableId && cartItems.length > 0 && !submitting;

  return (
    <div className="add-order__overlay" onClick={onClose}>
      <div className="add-order" onClick={e => e.stopPropagation()}>

        <div className="add-order__header">
          <h2 className="add-order__title">Nuevo Pedido</h2>
          <button className="add-order__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="add-order__table-row">
          <label className="add-order__label">Mesa</label>
          <select
            className="add-order__select"
            value={selectedTableId}
            onChange={e => setSelectedTableId(e.target.value)}
          >
            <option value="">Seleccionar mesa…</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>{t.tableName}</option>
            ))}
          </select>
        </div>

        {/* Search bar */}
        <div className="add-order__search-row">
          <span className="add-order__search-icon">🔍</span>
          <input
            className="add-order__search-input"
            placeholder="Buscar producto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="add-order__search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Category tabs — hidden during search */}
        {!term && tabCategories.length > 1 && (
          <div className="add-order__tabs">
            {tabCategories.map(cat => (
              <button
                key={cat.id}
                className={`add-order__tab${activeTab === cat.id ? ' add-order__tab--active' : ''}`}
                onClick={() => scrollToCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable menu */}
        <div className="add-order__menu" ref={menuRef}>
          {visibleCategories.length === 0 ? (
            <p className="add-order__empty">
              {term ? `Sin resultados para "${search}"` : 'Sin ítems de menú disponibles.'}
            </p>
          ) : (
            visibleCategories.map(cat => (
              <div
                key={cat.id}
                className="add-order__category"
                ref={el => { categoryRefs.current[cat.id] = el; }}
              >
                <h3 className="add-order__category-name">{cat.name}</h3>
                {cat.filteredItems.map(item => (
                  <div key={item.id} className="add-order__item">
                    <div className="add-order__item-info">
                      <span className="add-order__item-name">{item.name}</span>
                      <span className="add-order__item-price">{formatPrice(item.priceCents)}</span>
                    </div>
                    <div className="add-order__stepper">
                      <button
                        className="add-order__stepper-btn"
                        onClick={() => setQty(item.id, -1)}
                        disabled={!cart[item.id]}
                        aria-label="Quitar"
                      >−</button>
                      <span className="add-order__stepper-qty">{cart[item.id] || 0}</span>
                      <button
                        className="add-order__stepper-btn"
                        onClick={() => setQty(item.id, 1)}
                        aria-label="Agregar"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="add-order__notes-row">
          <input
            className="add-order__notes-input"
            placeholder="Notas (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={200}
          />
        </div>

        {error && <p className="add-order__error">{error}</p>}

        <div className="add-order__footer">
          {totalQty > 0 && (
            <span className="add-order__summary">
              {totalQty} {totalQty === 1 ? 'ítem' : 'ítems'} · {formatPrice(totalCents)}
            </span>
          )}
          <button
            className="add-order__submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? 'Enviando…' : 'CONFIRMAR PEDIDO'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddOrderModal;
