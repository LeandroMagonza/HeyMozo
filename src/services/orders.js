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
  Device
} = require('../models');

// Confirma un pedido del cliente.
//
// Lógica de merge (decidida en sprint3-design):
//   Si la sesión tiene un Order con status='pending' Y su Event "Nuevo Pedido"
//   sigue unseen (seenAt IS NULL), agregamos OrderItems a ese Order en vez de
//   crear uno nuevo. Si el mismo menuItemId ya está, sumamos qty. Si no, lo
//   agregamos como item nuevo.
//
//   Si NO existe tal Order, creamos uno nuevo + Event "Nuevo Pedido" purple
//   que dispara la AlertCard.
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
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('items requerido (array no vacío)');
    err.statusCode = 400;
    throw err;
  }

  // Resolver menuItems + validar que pertenezcan al branch de la mesa.
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

  const session = await TableSession.findByPk(tableSessionId);
  if (!session || session.tableId !== Number(tableId) || session.status !== 'active') {
    const err = new Error('Sesión inválida para esta mesa');
    err.statusCode = 400;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    // Buscar Order pending de la sesión cuyo Event siga unseen.
    // Postgres no permite FOR UPDATE con outer join, así que el Event lo
    // fetcheamos aparte (el lock va solo sobre Orders).
    const candidateOrder = await Order.findOne({
      where: { tableSessionId, status: 'pending' },
      order: [['createdAt', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    const candidateEvent = candidateOrder && candidateOrder.eventId
      ? await Event.findByPk(candidateOrder.eventId, { transaction: t })
      : null;

    const canMerge = candidateOrder
      && candidateEvent
      && candidateEvent.seenAt === null;

    let order;
    let merged = false;
    if (canMerge) {
      order = candidateOrder;
      merged = true;
    } else {
      // Crear Event "Nuevo Pedido" primero (necesitamos su id para Order.eventId).
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

      const now = new Date();
      const event = await Event.create({
        tableId,
        eventTypeId: nuevoPedidoType.id,
        message: null,
        createdAt: now,
        seenAt: null
      }, { transaction: t });

      order = await Order.create({
        tableSessionId,
        tableId,
        branchId,
        status: 'pending',
        createdByDeviceId: deviceId || null,
        eventId: event.id,
        totalCents: 0,
        notes: notes || null
      }, { transaction: t });
    }

    // Aplicar items: si el mismo menuItemId ya está en el order (caso merge),
    // sumar qty; sino crear OrderItem nuevo. Snapshots se capturan ahora.
    const existingItems = merged
      ? await OrderItem.findAll({ where: { orderId: order.id }, transaction: t, lock: t.LOCK.UPDATE })
      : [];
    const existingByMenuItemId = new Map(
      existingItems
        .filter((oi) => oi.menuItemId !== null)
        .map((oi) => [oi.menuItemId, oi])
    );

    for (const i of items) {
      const mi = menuItemsById.get(i.menuItemId);
      const existing = existingByMenuItemId.get(i.menuItemId);
      if (existing) {
        await existing.update({ qty: existing.qty + i.qty }, { transaction: t });
      } else {
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
    }

    // Recalcular total a partir de TODOS los items del order.
    const allItems = await OrderItem.findAll({
      where: { orderId: order.id },
      transaction: t
    });
    const totalCents = allItems.reduce((acc, oi) => acc + oi.unitPriceCents * oi.qty, 0);

    // Si era merge y el cliente agregó notas, concatenar (sin pisar).
    const newNotes = merged && notes
      ? [order.notes, notes].filter(Boolean).join('\n---\n')
      : (merged ? order.notes : (notes || null));

    await order.update({ totalCents, notes: newNotes }, { transaction: t });

    await t.commit();

    return getOrderById(order.id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getOrderById(orderId) {
  return Order.findByPk(orderId, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Event, as: 'event' },
      { model: Device, as: 'createdByDevice', attributes: ['id', 'emoji', 'name'] }
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
      { model: Device, as: 'createdByDevice', attributes: ['id', 'emoji', 'name'] }
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
  getOrderById,
  listActiveOrders,
  markOrderReady
};
