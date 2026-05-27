// Service de pagos cliente-iniciados.
//
// **Sprint 5.4 — cash / tarjeta**: el mozo cobra físicamente. El cliente
// elige método + propina; backend crea Event con eventType="Cobrar efectivo"
// / "Cobrar tarjeta" (cardVariant='red') + Payment(pending) linkeados. El
// mozo aprieta "Cobré $X" en OpShell → `collectPayment` marca paid + cierra
// la AlertCard.
//
// **Sprint 5.5 — transferencia / MODO**: el cliente paga online. NO crea
// Event (la validación es del cajero, no del mozo) y la propina se fuerza
// a 0 (decisión cerrada PHASE2_PLAN §Sprint 5: "Propina excluida en
// transferencia/MODO"). Flow:
//   pending           → cliente recibió alias/deeplink, todavía no pagó
//   awaiting_validation → cliente apretó "Ya transferí" (`declarePaid`)
//   paid              → cajero validó desde su app bancaria (`validatePayment`)
//   failed            → cajero rechazó (`rejectPayment`) o cliente canceló
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

// Métodos de cobro en persona (mozo cobra físicamente → flujo cash/card).
const IN_PERSON_METHODS = Object.keys(EVENT_NAME_BY_METHOD);
// Métodos online con declaración manual (cliente apretó "Ya transferí" →
// cajero valida desde su app bancaria). Flujo: pending → awaiting_validation
// → paid.
const ONLINE_METHODS = ['transfer', 'modo'];
// MP nativo: el cliente paga en el Checkout Pro hosteado por MP y volvemos
// por back_url + webhook. Flujo: pending → paid (vía applyMpPayment) o
// pending → failed. No pasa por awaiting_validation porque MP confirma solo.
// La propina está excluida hasta que Marketplace MP esté aprobado
// (PHASE2_PLAN §Sprint 5).
const MP_METHODS = ['mp_native'];
const SUPPORTED_METHODS = [...IN_PERSON_METHODS, ...ONLINE_METHODS, ...MP_METHODS];

// Métodos en los que un Payment "está vivo" para el cliente (banner sticky
// + redirect cuando se cierra). Para cash/card es solo pending. Para
// transfer/modo también awaiting_validation (cliente ya declaró el pago,
// está esperando que el cajero valide).
const ACTIVE_STATUSES = ['pending', 'awaiting_validation'];

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

// Crea Payment(pending). Para cash/card también crea un Event (alerta al
// mozo en OpShell) y los linkea por Payment.eventId. Para transfer/modo
// NO crea Event: la validación es del cajero (tab "Acciones" en CajaShell,
// Sprint 5.8) y no debe ensuciar el feed del mozo. Además, transfer/modo
// fuerza tipCents=0 (PHASE2_PLAN §Sprint 5: "Propina excluida").
//
// Params:
//   tableId       — mesa
//   deviceId      — device del cliente (cookie)
//   tableSessionId — sesión activa validada por el caller
//   method        — 'cash' | 'card_terminal' | 'transfer' | 'modo'
//   tipCents      — propina en cents (>= 0); ignorado para transfer/modo
async function requestPayment({ tableId, deviceId, tableSessionId, method, tipCents }) {
  if (!SUPPORTED_METHODS.includes(method)) {
    const err = new Error(`method debe ser uno de: ${SUPPORTED_METHODS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  const isOnline = ONLINE_METHODS.includes(method);
  const isMp = MP_METHODS.includes(method);
  // Online (transfer/modo) y MP nativo: propina excluida hasta Marketplace
  // (PHASE2_PLAN §Sprint 5). Cash/card sí aceptan tip.
  const tip = (isOnline || isMp)
    ? 0
    : (Number.isFinite(tipCents) && tipCents > 0 ? Math.floor(tipCents) : 0);

  const table = await Table.findByPk(tableId, {
    include: [{ model: Branch, attributes: ['id', 'companyId'] }]
  });
  if (!table) {
    const err = new Error('Mesa no encontrada');
    err.statusCode = 404;
    throw err;
  }
  const companyId = table.Branch.companyId;

  // Solo cash/card necesitan EventType seedeado. Para transfer/modo/MP no
  // creamos Event y no hace falta resolverlo (la validación llega por cajero
  // o por webhook MP, no por el mozo de piso).
  let eventTypeId = null;
  if (!isOnline && !isMp) {
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
    eventTypeId = eventType.id;
  }

  // Si ya hay un Payment del MISMO método en estado activo para esta sesión,
  // devolvemos ese — el cliente apretó dos veces o volvió de otra pantalla.
  // Cash/card: solo "pending"; transfer/modo: pending o awaiting_validation.
  const existingActive = await Payment.findOne({
    where: {
      tableSessionId,
      method,
      status: { [Op.in]: ACTIVE_STATUSES }
    },
    order: [['createdAt', 'DESC']]
  });
  if (existingActive) {
    return existingActive;
  }

  const t = await sequelize.transaction();
  try {
    const subtotalCents = await _outstandingBalanceCents(tableSessionId, { transaction: t });
    if (subtotalCents <= 0) {
      const err = new Error('No hay saldo pendiente para cobrar en esta sesión');
      err.statusCode = 400;
      throw err;
    }

    let eventId = null;
    if (eventTypeId) {
      const event = await Event.create({
        tableId,
        eventTypeId,
        message: null,
        seenAt: null
      }, { transaction: t });
      eventId = event.id;
    }

    const payment = await Payment.create({
      tableSessionId,
      deviceId: deviceId || null,
      eventId,
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

// Devuelve el Payment activo más reciente para la sesión (cash/card/
// transfer/modo) o null. "Activo" = pending o awaiting_validation. El
// banner sticky del cliente pollea cada N segundos y mientras haya uno
// activo muestra "Esperando…"; al transitar a paid/failed redirige.
async function findPendingForSession(tableSessionId) {
  return Payment.findOne({
    where: {
      tableSessionId,
      status: { [Op.in]: ACTIVE_STATUSES },
      method: { [Op.in]: SUPPORTED_METHODS }
    },
    order: [['createdAt', 'DESC']]
  });
}

// Devuelve { id, status, subtotalCents, tipCents, totalCents, method, paidAt,
// collectedByUserId, proofUrl } — todo lo que el cliente necesita para mostrar
// el estado y el waiting sheet (transfer expone proofUrl al cajero en 5.8).
async function getPaymentForClient(paymentId) {
  const payment = await Payment.findByPk(paymentId, {
    attributes: [
      'id', 'tableSessionId', 'deviceId', 'method', 'status',
      'subtotalCents', 'tipCents', 'totalCents', 'paidAt', 'collectedByUserId',
      'proofUrl'
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
  if (!IN_PERSON_METHODS.includes(payment.method)) {
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

// Cliente cancela su Payment activo (pending o awaiting_validation):
// Payment.failed + Event.seenAt (si hay Event linkeado).
// Aceptamos awaiting_validation porque el cliente puede arrepentirse después
// de tocar "Ya transferí" pero antes de que el cajero valide (caso real:
// se equivocó de monto / dio click sin querer).
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
  if (!ACTIVE_STATUSES.includes(payment.status)) {
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

// ─── Sprint 5.5 — transferencia / MODO ───────────────────────────────────

// Cliente declara que ya pagó (apretó "Ya transferí" en TransferWaitingSheet
// o "Ya pagué" en ModoWaitingSheet). Payment pending → awaiting_validation.
// Guarda proofUrl si vino. El cajero validará desde CajaShell (Sprint 5.8).
async function declarePaid({ paymentId, deviceId, proofUrl }) {
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
  if (!ONLINE_METHODS.includes(payment.method)) {
    const err = new Error(`declarePaid solo aplica a transfer/modo (recibido: ${payment.method})`);
    err.statusCode = 400;
    throw err;
  }
  if (payment.status !== 'pending') {
    const err = new Error(`Payment está en "${payment.status}" — no se puede declarar de nuevo`);
    err.statusCode = 409;
    throw err;
  }

  const update = { status: 'awaiting_validation' };
  if (typeof proofUrl === 'string' && proofUrl.trim()) {
    update.proofUrl = proofUrl.trim().slice(0, 1024);
  }
  await payment.update(update);
  return payment.reload();
}

// Cajero (cashier/owner) confirma que el dinero llegó. Payment
// awaiting_validation → paid + collectedByUserId + paidAt. Auto-cierra la
// sesión si el balance llegó a 0.
async function validatePayment({ paymentId, userId }) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    const err = new Error('Payment no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (!ONLINE_METHODS.includes(payment.method)) {
    const err = new Error(`validatePayment solo aplica a transfer/modo (recibido: ${payment.method})`);
    err.statusCode = 400;
    throw err;
  }
  if (payment.status !== 'awaiting_validation') {
    const err = new Error(`Payment está en "${payment.status}" — no se puede validar`);
    err.statusCode = 409;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    const now = new Date();
    await payment.update({
      status: 'paid',
      paidAt: now,
      collectedByUserId: userId
    }, { transaction: t });

    const remaining = await _outstandingBalanceCents(payment.tableSessionId, { transaction: t });
    if (remaining === 0) {
      const session = await TableSession.findByPk(payment.tableSessionId, { transaction: t });
      if (session && session.status === 'active') {
        await session.update({ status: 'closed', closedAt: now }, { transaction: t });
      }
    }

    await t.commit();
    return payment.reload();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Cajero rechaza la transferencia (no llegó / monto mal). Payment
// awaiting_validation → failed. El cliente verá el cambio por polling y
// podrá elegir otro método.
async function rejectPayment({ paymentId, userId }) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    const err = new Error('Payment no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (!ONLINE_METHODS.includes(payment.method)) {
    const err = new Error(`rejectPayment solo aplica a transfer/modo (recibido: ${payment.method})`);
    err.statusCode = 400;
    throw err;
  }
  if (payment.status !== 'awaiting_validation') {
    const err = new Error(`Payment está en "${payment.status}" — no se puede rechazar`);
    err.statusCode = 409;
    throw err;
  }
  await payment.update({ status: 'failed', collectedByUserId: userId });
  return payment.reload();
}

// ─── Sprint 5.6 — MP nativo ──────────────────────────────────────────────

// Aplica el resultado de un MP payment al Payment local. Llamada desde el
// webhook handler después de verificar firma + fetchear MP payment.
//
// Idempotente: si el Payment ya está en estado final, no hace nada (MP
// reenvía webhooks).
//
// Si MP confirmó (approved → paid), marca paidAt + collectedByUserId=null
// (no hay user humano que cobre — fue MP) + auto-cierra la sesión si el
// balance llegó a 0. Si MP rechazó/canceló → failed sin tocar la sesión.
//
// Args:
//   paymentId    — id local
//   nextStatus   — 'paid' | 'failed' (calculado por mapMpStatus del caller)
//   mpPaymentId  — id de MP
//   mpRawPayload — payload completo de MP (lo guardamos para debugging)
async function applyMpPayment({ paymentId, nextStatus, mpPaymentId, mpRawPayload }) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    const err = new Error(`Payment ${paymentId} no encontrado (webhook MP)`);
    err.statusCode = 404;
    throw err;
  }
  if (payment.method !== 'mp_native') {
    const err = new Error(`Payment ${paymentId} no es mp_native (${payment.method})`);
    err.statusCode = 400;
    throw err;
  }
  // Idempotencia: si ya está cerrado, registramos el mpPaymentId si todavía
  // no estaba y volvemos. MP reenvía webhooks varias veces — esto es esperado.
  const isTerminal = payment.status === 'paid' || payment.status === 'failed';
  if (isTerminal) {
    if (mpPaymentId && payment.mpPaymentId !== String(mpPaymentId)) {
      await payment.update({
        mpPaymentId: String(mpPaymentId),
        mpRawPayload: mpRawPayload || payment.mpRawPayload
      });
    }
    return payment;
  }

  // Sólo manejamos transiciones a paid o failed. Si nextStatus es null
  // (pending/in_process), guardamos el payload pero no movemos el estado.
  if (nextStatus !== 'paid' && nextStatus !== 'failed') {
    await payment.update({
      mpPaymentId: mpPaymentId ? String(mpPaymentId) : payment.mpPaymentId,
      mpRawPayload: mpRawPayload || payment.mpRawPayload
    });
    return payment;
  }

  const t = await sequelize.transaction();
  try {
    const now = new Date();
    const update = {
      status: nextStatus,
      mpPaymentId: mpPaymentId ? String(mpPaymentId) : payment.mpPaymentId,
      mpRawPayload: mpRawPayload || payment.mpRawPayload
    };
    if (nextStatus === 'paid') {
      update.paidAt = now;
    }
    await payment.update(update, { transaction: t });

    if (nextStatus === 'paid') {
      const remaining = await _outstandingBalanceCents(payment.tableSessionId, { transaction: t });
      if (remaining === 0) {
        const session = await TableSession.findByPk(payment.tableSessionId, { transaction: t });
        if (session && session.status === 'active') {
          await session.update({ status: 'closed', closedAt: now }, { transaction: t });
        }
      }
    }

    await t.commit();
    return payment.reload();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Lista de Payments awaiting_validation para el branch (la usa Acciones tab
// de CajaShell — Sprint 5.8 — y permite smoke-test en 5.5).
async function listAwaitingValidationForBranch(branchId) {
  return Payment.findAll({
    where: { status: 'awaiting_validation', method: { [Op.in]: ONLINE_METHODS } },
    include: [{
      model: TableSession,
      as: 'session',
      required: true,
      include: [{
        model: Table,
        as: 'table',
        where: { branchId },
        attributes: ['id', 'tableName', 'branchId'],
        required: true
      }]
    }],
    order: [['createdAt', 'ASC']]
  });
}

module.exports = {
  SUPPORTED_METHODS,
  IN_PERSON_METHODS,
  ONLINE_METHODS,
  MP_METHODS,
  ACTIVE_STATUSES,
  EVENT_NAME_BY_METHOD,
  requestPayment,
  collectPayment,
  cancelPayment,
  declarePaid,
  validatePayment,
  rejectPayment,
  applyMpPayment,
  listAwaitingValidationForBranch,
  getPaymentForClient,
  findPendingForSession
};
