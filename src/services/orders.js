const sequelize = require('../config/database');
const {
  Order,
  OrderItem,
  MenuItem,
  TableSession,
  Table,
  Branch,
  Company,
  EventType,
  Event,
  Device,
  User
} = require('../models');
const { ensureActiveSessionForStaff } = require('./sessions');

// Helper privado compartido entre confirmOrder (cliente) y staffAddOrder (mozo).
// Valida items, resuelve MenuItems contra el branch, crea Event "Nuevo Pedido"
// + Order + OrderItems en una sola transacción.
//
// Params:
//   tableId, tableSessionId — mesa + sesión target (sesión ya validada por el
//                              caller; acá solo se confía).
//   branchId, companyId    — derivados por el caller para evitar refetch.
//   items                  — [{ menuItemId, qty, notes? }]
//   notes                  — texto libre opcional a nivel order.
//   createdByDeviceId      — device confirmador (cliente). Null si lo carga el mozo.
//   createdByUserId        — User que cargó el pedido (mozo). Null si cliente.
//   autoSeenEvent          — si true, el Event "Nuevo Pedido" se crea con
//                            seenAt=now (no genera AlertCard). Reservado para
//                            flujos staff donde la card no tiene sentido —
//                            por default (false), el mozo todavía ve la card.
//
// Devuelve el orderId (el caller hace getOrderById fuera de la transacción).
async function _createOrderWithItemsTx({
  tableId,
  tableSessionId,
  branchId,
  companyId,
  items,
  notes,
  createdByDeviceId,
  createdByUserId,
  autoSeenEvent
}) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('items requerido (array no vacío)');
    err.statusCode = 400;
    throw err;
  }

  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const menuItems = await MenuItem.findAll({
    where: { id: menuItemIds },
    include: [{ association: 'category', attributes: ['id', 'branchId'] }]
  });
  const menuItemsById = new Map(menuItems.map((mi) => [mi.id, mi]));

  for (const i of items) {
    const mi = menuItemsById.get(i.menuItemId);
    if (!mi) {
      const err = new Error(`MenuItem ${i.menuItemId} no encontrado`);
      err.statusCode = 400;
      throw err;
    }
    if (!mi.category || mi.category.branchId !== branchId) {
      const err = new Error(`MenuItem ${i.menuItemId} no pertenece a esta sucursal`);
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isInteger(i.qty) || i.qty < 1) {
      const err = new Error(`qty inválido para menuItemId ${i.menuItemId}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const nuevoPedidoType = await EventType.findOne({
    where: { companyId, eventName: 'Nuevo Pedido', isActive: true }
  });
  if (!nuevoPedidoType) {
    const err = new Error(
      'EventType "Nuevo Pedido" no encontrado para la company. ' +
      'Correr migration 20260517_backfill_nuevo_pedido_event_type.'
    );
    err.statusCode = 500;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    const now = new Date();
    const event = await Event.create({
      tableId,
      eventTypeId: nuevoPedidoType.id,
      message: null,
      createdAt: now,
      seenAt: autoSeenEvent ? now : null
    }, { transaction: t });

    const totalCents = items.reduce((acc, i) => {
      return acc + menuItemsById.get(i.menuItemId).priceCents * i.qty;
    }, 0);

    const order = await Order.create({
      tableSessionId,
      tableId,
      branchId,
      status: 'pending',
      createdByDeviceId: createdByDeviceId || null,
      createdByUserId: createdByUserId || null,
      eventId: event.id,
      totalCents,
      notes: notes || null
    }, { transaction: t });

    for (const i of items) {
      const mi = menuItemsById.get(i.menuItemId);
      await OrderItem.create({
        orderId: order.id,
        menuItemId: mi.id,
        nameSnapshot: mi.name,
        descriptionSnapshot: mi.description || null,
        unitPriceCents: mi.priceCents,
        qty: i.qty,
        notes: i.notes || null
      }, { transaction: t });
    }

    await t.commit();
    return order.id;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Confirma un pedido del cliente.
//
// Cada confirmación crea un Order + Event "Nuevo Pedido" propios (sin merge).
// Razón (decidida 2026-05-17): el mozo ve una card por pedido — lo que está
// en la card es exactamente lo que tiene que llevar. Si el cliente confirma
// dos veces, son dos cards distintas; nunca hay items "invisibles" que se
// colaron en una card ya abierta. El costo (apretar LISTO N veces) es
// trivial frente al riesgo de perder items.
//
// Snapshots: nameSnapshot + descriptionSnapshot + unitPriceCents se congelan
// al confirmar. Cambios futuros de precio del MenuItem NO mutan este pedido.
//
// Params:
//   tableId       — mesa donde se confirma
//   deviceId      — device confirmador (queda en createdByDeviceId)
//   tableSessionId — sesión a la que pertenece el pedido
//   items         — [{ menuItemId, qty, notes? }]
//   notes         — texto libre opcional a nivel order
//
// Devuelve el Order con sus items y eventId asociado.
async function confirmOrder({ tableId, deviceId, tableSessionId, items, notes }) {
  const table = await Table.findByPk(tableId, {
    include: [{ model: Branch, include: [{ model: Company }] }]
  });
  if (!table) {
    const err = new Error('Mesa no encontrada');
    err.statusCode = 404;
    throw err;
  }
  const branchId = table.Branch.id;
  const companyId = table.Branch.Company.id;

  const session = await TableSession.findByPk(tableSessionId);
  if (!session || session.tableId !== Number(tableId) || session.status !== 'active') {
    const err = new Error('Sesión inválida para esta mesa');
    err.statusCode = 400;
    throw err;
  }

  const orderId = await _createOrderWithItemsTx({
    tableId,
    tableSessionId,
    branchId,
    companyId,
    items,
    notes,
    createdByDeviceId: deviceId,
    createdByUserId: null,
    autoSeenEvent: false
  });

  return getOrderById(orderId);
}

// Mozo carga un pedido en persona desde OpShell.
//
// Diferencia con confirmOrder:
//   - createdByDeviceId = null, createdByUserId = userId (auditoría)
//   - Resuelve / crea TableSession via ensureActiveSessionForStaff (sin
//     TableSessionDevice — el mozo no participa como device follower).
//   - El Event "Nuevo Pedido" se crea unseen igual (autoSeenEvent=false): el
//     mozo de piso debe ver la card para llevar/preparar el pedido como
//     cualquier otro. Quien lo cargó (cajero, otro mozo) es lo de menos.
//
// Params:
//   tableId  — mesa a la que se le carga el pedido
//   userId   — User staff que está cargando (queda en createdByUserId)
//   items    — [{ menuItemId, qty, notes? }]
//   notes    — texto libre opcional a nivel order
//
// Devuelve el Order con sus items y eventId asociado.
async function staffAddOrder({ tableId, userId, items, notes }) {
  if (!userId) {
    const err = new Error('userId requerido');
    err.statusCode = 400;
    throw err;
  }

  const table = await Table.findByPk(tableId, {
    include: [{ model: Branch, include: [{ model: Company }] }]
  });
  if (!table) {
    const err = new Error('Mesa no encontrada');
    err.statusCode = 404;
    throw err;
  }
  const branchId = table.Branch.id;
  const companyId = table.Branch.Company.id;

  const { session } = await ensureActiveSessionForStaff({ tableId });

  const orderId = await _createOrderWithItemsTx({
    tableId,
    tableSessionId: session.id,
    branchId,
    companyId,
    items,
    notes,
    createdByDeviceId: null,
    createdByUserId: userId,
    autoSeenEvent: false
  });

  return getOrderById(orderId);
}

async function getOrderById(orderId) {
  return Order.findByPk(orderId, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Event, as: 'event' },
      { model: Device, as: 'createdByDevice', attributes: ['id', 'emoji', 'name'] },
      { model: User, as: 'createdByUser', attributes: ['id', 'email', 'name'] }
    ]
  });
}

// Listado de Orders pending por branch — alimenta el grid de AlertCards del piso.
async function listActiveOrders({ branchId }) {
  return Order.findAll({
    where: { branchId, status: 'pending' },
    include: [
      { model: OrderItem, as: 'items' },
      { model: Event, as: 'event' },
      { model: Table, as: 'table', attributes: ['id', 'tableName'] },
      { model: Device, as: 'createdByDevice', attributes: ['id', 'emoji', 'name'] },
      { model: User, as: 'createdByUser', attributes: ['id', 'email', 'name'] }
    ],
    order: [['createdAt', 'ASC']]
  });
}

// Mozo marca pedido como entregado/listo.
// - Order.status → 'ready'
// - Event "Nuevo Pedido" asociado se marca seenAt = now (la AlertCard desaparece
//   y los próximos pedidos NO mergean acá, crean Order nuevo).
async function markOrderReady({ orderId }) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Event, as: 'event' }]
  });
  if (!order) {
    const err = new Error('Order no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (order.status === 'ready') {
    return order; // idempotente
  }
  if (order.status !== 'pending') {
    const err = new Error(`No se puede marcar ready un order con status='${order.status}'`);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const t = await sequelize.transaction();
  try {
    await order.update({ status: 'ready' }, { transaction: t });
    if (order.event && order.event.seenAt === null) {
      await order.event.update({ seenAt: now }, { transaction: t });
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return getOrderById(orderId);
}

module.exports = {
  confirmOrder,
  staffAddOrder,
  getOrderById,
  listActiveOrders,
  markOrderReady
};
