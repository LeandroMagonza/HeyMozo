// Sprint 5.4 — service de pagos cash / tarjeta.
//
// El cliente (en el bottom sheet de PaymentMethodSheet) elige método +
// propina. El backend:
//   1. Calcula el subtotal pendiente: sum(Orders.totalCents activos de la
//      sesión) - sum(Payments.paid.subtotalCents).
//   2. Crea un Event con eventType = "Cobrar efectivo" / "Cobrar tarjeta"
//      (cardVariant='red') que pinta la AlertCard en OpShell.
//   3. Crea un Payment(status='pending', method, subtotalCents, tipCents)
//      con eventId = Event.id para que /active-alerts pueda surface el
//      monto y el paymentId.
//
// Cuando el mozo aprieta "Cobré $X" en OpShell, `collectPayment` cierra el
// Payment (status='paid', paidAt=now, collectedByUserId=mozo) y marca el
// Event seenAt — todo en una transacción.
//
// El cliente hace polling de /payments/:id/status para saber cuándo redirect
// a la pantalla de "Pago confirmado".

const sequelize = require('../config/database');
const {
  Payment,
  Event,
  EventType,
  Order,
  Table,
  Branch,
  TableSession
} = require('../models');
const { Op } = require('sequelize');

// Nombres canónicos de EventType para cash / card. Tiene que matchear lo
// seedeado por createDefaultEventTypes + la migration 5.4.
const EVENT_NAME_BY_METHOD = {
  cash: 'Cobrar efectivo',
  card_terminal: 'Cobrar tarjeta'
};

const SUPPORTED_METHODS = Object.keys(EVENT_NAME_BY_METHOD);

// Devuelve el balance pendiente de la sesión en cents:
// sum(Order.totalCents) - sum(Payment.paid.subtotalCents).
// Las propinas NO entran en el balance (decisión Sprint 5).
async function _outstandingBalanceCents(tableSessionId, { transaction } = {}) {
  const orderSum = (await Order.sum('totalCents', {
    where: { tableSessionId },
    transaction
  })) || 0;
  const paidSubtotalSum = (await Payment.sum('subtotalCents', {
    where: { tableSessionId, status: 'paid' },
    transaction
  })) || 0;
  return Math.max(orderSum - paidSubtotalSum, 0);
}

// Crea Payment(pending) + Event(unseen) y los linkea.
//
// Params:
//   tableId       — mesa de la mesa
//   deviceId      — device del cliente (cookie)
//   tableSessionId — sesión activa validada por el caller
//   method        — 'cash' | 'card_terminal'
//   tipCents      — propina en cents (>= 0)
async function requestPayment({ tableId, deviceId, tableSessionId, method, tipCents }) {
  if (!SUPPORTED_METHODS.includes(method)) {
    const err = new Error(`method debe ser uno de: ${SUPPORTED_METHODS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  const tip = Number.isFinite(tipCents) && tipCents > 0 ? Math.floor(tipCents) : 0;

  const table = await Table.findByPk(tableId, {
    include: [{ model: Branch, attributes: ['id', 'companyId'] }]
  });
  if (!table) {
    const err = new Error('Mesa no encontrada');
    err.statusCode = 404;
    throw err;
  }
  const companyId = table.Branch.companyId;

  const eventName = EVENT_NAME_BY_METHOD[method];
  const eventType = await EventType.findOne({
    where: { companyId, eventName, isActive: true }
  });
  if (!eventType) {
    const err = new Error(
      `EventType "${eventName}" no encontrado para la company. ` +
      'Correr migration 20260525_add_payment_event_link_and_request_types.'
    );
    err.statusCode = 500;
    throw err;
  }

  // Verifica que no haya ya un Payment pending de cash/card para esta sesión:
  // si el cliente apretó "Pagar" dos veces, devolvemos el mismo Payment en
  // lugar de duplicar la alerta.
  const existingPending = await Payment.findOne({
    where: {
      tableSessionId,
      status: 'pending',
      method: { [Op.in]: SUPPORTED_METHODS }
    },
    order: [['createdAt', 'DESC']]
  });
  if (existingPending) {
    return existingPending;
  }

  const t = await sequelize.transaction();
  try {
    const subtotalCents = await _outstandingBalanceCents(tableSessionId, { transaction: t });
    if (subtotalCents <= 0) {
      const err = new Error('No hay saldo pendiente para cobrar en esta sesión');
      err.statusCode = 400;
      throw err;
    }

    const event = await Event.create({
      tableId,
      eventTypeId: eventType.id,
      message: null,
      seenAt: null
    }, { transaction: t });

    const payment = await Payment.create({
      tableSessionId,
      deviceId: deviceId || null,
      eventId: event.id,
      method,
      subtotalCents,
      tipCents: tip,
      totalCents: subtotalCents + tip,
      status: 'pending'
    }, { transaction: t });

    await t.commit();
    return payment;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Devuelve { id, status, subtotalCents, tipCents, totalCents, method, paidAt,
// collectedByUserId } — todo lo que el cliente necesita para mostrar el estado.
async function getPaymentForClient(paymentId) {
  const payment = await Payment.findByPk(paymentId, {
    attributes: [
      'id', 'tableSessionId', 'deviceId', 'method', 'status',
      'subtotalCents', 'tipCents', 'totalCents', 'paidAt', 'collectedByUserId'
    ]
  });
  return payment;
}

// El mozo (waiter/cashier/owner) confirma que cobró un Payment cash/card.
// Marca Payment.status='paid' + paidAt + collectedByUserId. Marca el Event
// asociado como seen (la AlertCard desaparece de OpShell).
//
// Params:
//   paymentId
//   userId             — quien cerró el cobro (req.user.id)
//   cashTenderedCents  — opcional, solo cash, para tracking del vuelto.
async function collectPayment({ paymentId, userId, cashTenderedCents }) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    const err = new Error('Payment no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (!SUPPORTED_METHODS.includes(payment.method)) {
    const err = new Error(`Este endpoint solo cobra cash / tarjeta (recibido: ${payment.method})`);
    err.statusCode = 400;
    throw err;
  }
  if (payment.status !== 'pending') {
    const err = new Error(`Payment ya está en estado "${payment.status}" — no se puede cobrar de nuevo`);
    err.statusCode = 409;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    const now = new Date();
    await payment.update({
      status: 'paid',
      paidAt: now,
      collectedByUserId: userId,
      cashTenderedCents: payment.method === 'cash' && Number.isFinite(cashTenderedCents)
        ? Math.floor(cashTenderedCents)
        : null
    }, { transaction: t });

    if (payment.eventId) {
      await Event.update(
        { seenAt: now },
        { where: { id: payment.eventId }, transaction: t }
      );
    }

    // Auto-cerrar la sesión si el balance llegó a 0 (caso feliz).
    const remaining = await _outstandingBalanceCents(payment.tableSessionId, { transaction: t });
    if (remaining === 0) {
      const session = await TableSession.findByPk(payment.tableSessionId, { transaction: t });
      if (session && session.status === 'active') {
        await session.update({
          status: 'closed',
          closedAt: now
        }, { transaction: t });
      }
    }

    await t.commit();
    return payment.reload();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Cliente cancela su Payment pendiente: Payment.failed + Event.seenAt.
async function cancelPayment({ paymentId, deviceId }) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    const err = new Error('Payment no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (payment.deviceId && deviceId && payment.deviceId !== deviceId) {
    const err = new Error('Este device no creó el Payment');
    err.statusCode = 403;
    throw err;
  }
  if (payment.status !== 'pending') {
    const err = new Error(`Payment está en "${payment.status}" — no se puede cancelar`);
    err.statusCode = 409;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    const now = new Date();
    await payment.update({ status: 'failed' }, { transaction: t });
    if (payment.eventId) {
      await Event.update(
        { seenAt: now },
        { where: { id: payment.eventId }, transaction: t }
      );
    }
    await t.commit();
    return payment.reload();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  SUPPORTED_METHODS,
  EVENT_NAME_BY_METHOD,
  requestPayment,
  collectPayment,
  cancelPayment,
  getPaymentForClient
};
