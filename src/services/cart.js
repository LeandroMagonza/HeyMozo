// Cliente-side cart, persistido en localStorage.
//
// Key scope `hm_cart:b{branchId}:t{tableId}` — evita cross-table:
// si el mismo browser escanea dos mesas distintas, cada una tiene su carrito.
// El server NUNCA ve el carrito hasta confirmar (POST /orders).
//
// Shape almacenada:
//   { items: [{ menuItemId, name, priceCents, qty, notes? }] }
//
// Notas:
// - `name` + `priceCents` se snapshottean al agregar para mostrar precios
//   estables si el menú cambia entre tabs/recargas (el snapshot real para
//   el order vive en backend, esto es solo para UI).
// - Eventos custom `hm_cart_changed` se disparan para que el bottom bar de
//   MenuClient reaccione sin re-fetch.

const CART_EVENT = 'hm_cart_changed';

function cartKey(branchId, tableId) {
  return `hm_cart:b${branchId}:t${tableId}`;
}

function emptyCart() {
  return { items: [] };
}

export function readCart(branchId, tableId) {
  try {
    const raw = localStorage.getItem(cartKey(branchId, tableId));
    if (!raw) return emptyCart();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return emptyCart();
    return parsed;
  } catch {
    return emptyCart();
  }
}

function writeCart(branchId, tableId, cart) {
  localStorage.setItem(cartKey(branchId, tableId), JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent(CART_EVENT, {
    detail: { branchId: String(branchId), tableId: String(tableId) }
  }));
}

export function clearCart(branchId, tableId) {
  localStorage.removeItem(cartKey(branchId, tableId));
  window.dispatchEvent(new CustomEvent(CART_EVENT, {
    detail: { branchId: String(branchId), tableId: String(tableId) }
  }));
}

export function addItem(branchId, tableId, menuItem) {
  const cart = readCart(branchId, tableId);
  const existing = cart.items.find((i) => i.menuItemId === menuItem.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.items.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      priceCents: menuItem.priceCents,
      qty: 1,
      notes: null
    });
  }
  writeCart(branchId, tableId, cart);
  return cart;
}

export function incrementItem(branchId, tableId, menuItemId) {
  const cart = readCart(branchId, tableId);
  const it = cart.items.find((i) => i.menuItemId === menuItemId);
  if (it) it.qty += 1;
  writeCart(branchId, tableId, cart);
  return cart;
}

export function decrementItem(branchId, tableId, menuItemId) {
  const cart = readCart(branchId, tableId);
  const idx = cart.items.findIndex((i) => i.menuItemId === menuItemId);
  if (idx === -1) return cart;
  const it = cart.items[idx];
  if (it.qty <= 1) {
    cart.items.splice(idx, 1);
  } else {
    it.qty -= 1;
  }
  writeCart(branchId, tableId, cart);
  return cart;
}

export function removeItem(branchId, tableId, menuItemId) {
  const cart = readCart(branchId, tableId);
  cart.items = cart.items.filter((i) => i.menuItemId !== menuItemId);
  writeCart(branchId, tableId, cart);
  return cart;
}

export function setNotes(branchId, tableId, menuItemId, notes) {
  const cart = readCart(branchId, tableId);
  const it = cart.items.find((i) => i.menuItemId === menuItemId);
  if (it) it.notes = notes && notes.trim() ? notes : null;
  writeCart(branchId, tableId, cart);
  return cart;
}

export function cartTotalCents(cart) {
  return cart.items.reduce((acc, i) => acc + i.priceCents * i.qty, 0);
}

export function cartItemCount(cart) {
  return cart.items.reduce((acc, i) => acc + i.qty, 0);
}

// Subscripción al evento custom de cambio. Devuelve función para desuscribir.
export function subscribeCart(branchId, tableId, onChange) {
  const key = `${branchId}:${tableId}`;
  const handler = (e) => {
    const { branchId: b, tableId: t } = e.detail || {};
    if (`${b}:${t}` === key) onChange();
  };
  window.addEventListener(CART_EVENT, handler);
  return () => window.removeEventListener(CART_EVENT, handler);
}
