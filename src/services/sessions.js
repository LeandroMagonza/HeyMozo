const sequelize = require('../config/database');
const { TableSession, TableSessionDevice, Table, Branch, Company, EventType, Event, Order, Payment } = require('../models');

// Atacha un Device a la TableSession activa de la mesa.
// - Si no hay sesión activa: crea TableSession nueva, este device queda como
//   leader (isLeader=true, approvedById=null) y se dispara un Event OCCUPY
//   para que la mesa figure ocupada en el piso.
// - Si hay sesión activa y el device ya estaba en ella: idempotente, devuelve
//   los datos actuales (actualiza lastHeartbeatAt).
// - Si hay sesión activa y el device es nuevo: lo attacha como follower SIN
//   aprobación. La aprobación transitiva se postergó a Sprint 6 (ver
//   PHASE2_PLAN.md "Decisiones cerradas" + memoria sprint3-design).
//
// Devuelve { session, participant, isNewSession, isNewParticipant }.
async function attachDeviceToTable({ tableId, deviceId }) {
  if (!tableId || !deviceId) {
    const err = new Error('tableId y deviceId son requeridos');
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

  let session = await TableSession.findOne({
    where: { tableId, status: 'active' },
    order: [['openedAt', 'DESC']]
  });

  let isNewSession = false;
  if (!session) {
    session = await TableSession.create({
      tableId,
      status: 'active',
      openedAt: new Date(),
      leaderDeviceId: deviceId
    });
    isNewSession = true;

    // Crear Event OCCUPY para que la mesa aparezca ocupada en el piso.
    // Auto-seen — system event, no genera AlertCard.
    const companyId = table.Branch.Company.id;
    const occupyEventType = await EventType.findOne({
      where: { companyId, systemEventType: 'OCCUPY', isActive: true }
    });
    if (occupyEventType) {
      const now = new Date();
      await Event.create({
        tableId,
        eventTypeId: occupyEventType.id,
        message: null,
        createdAt: now,
        seenAt: now
      });
    }
  }

  const now = new Date();
  let participant = await TableSessionDevice.findOne({
    where: { tableSessionId: session.id, deviceId }
  });

  let isNewParticipant = false;
  if (!participant) {
    participant = await TableSessionDevice.create({
      tableSessionId: session.id,
      deviceId,
      isLeader: isNewSession,
      joinedAt: now,
      lastHeartbeatAt: now,
      approvedById: null
    });
    isNewParticipant = true;
  } else {
    await participant.update({ lastHeartbeatAt: now });
  }

  return { session, participant, isNewSession, isNewParticipant };
}

// Garantiza que la mesa tenga una TableSession activa, sin requerir un device.
//
// Pensado para el flujo "mozo agrega items en persona" (Sprint 4): el mozo no
// es un device — no se atacha a TableSessionDevice ni queda como leader. Solo
// necesitamos que exista una sesión activa contra la que colgar el Order.
//
// Comportamiento:
//   - Si ya hay sesión activa: la devuelve tal cual (idempotente). NO crea
//     evento OCCUPY ni TableSessionDevice.
//   - Si no hay: crea TableSession con leaderDeviceId=null y dispara Event
//     OCCUPY auto-seen (mismo patrón que attachDeviceToTable), para que la
//     mesa figure ocupada en el piso. No se crea TableSessionDevice — el
//     mozo no participa como follower.
//
// Devuelve { session, isNewSession }.
async function ensureActiveSessionForStaff({ tableId }) {
  if (!tableId) {
    const err = new Error('tableId es requerido');
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

  let session = await TableSession.findOne({
    where: { tableId, status: 'active' },
    order: [['openedAt', 'DESC']]
  });

  if (session) {
    return { session, isNewSession: false };
  }

  session = await TableSession.create({
    tableId,
    status: 'active',
    openedAt: new Date(),
    leaderDeviceId: null
  });

  const companyId = table.Branch.Company.id;
  const occupyEventType = await EventType.findOne({
    where: { companyId, systemEventType: 'OCCUPY', isActive: true }
  });
  if (occupyEventType) {
    const now = new Date();
    await Event.create({
      tableId,
      eventTypeId: occupyEventType.id,
      message: null,
      createdAt: now,
      seenAt: now
    });
  }

  return { session, isNewSession: true };
}

// Busca la sesión activa de la mesa. Devuelve null si no hay.
// Útil para el cliente que quiere saber si está adjunto antes de confirmar.
async function getActiveSession(tableId) {
  return TableSession.findOne({
    where: { tableId, status: 'active' },
    order: [['openedAt', 'DESC']],
    include: [{
      model: TableSessionDevice,
      as: 'participants',
      include: [{ association: 'device' }]
    }]
  });
}

// Verifica si un device está adjunto a la sesión activa de la mesa.
async function isDeviceAttached({ tableId, deviceId }) {
  const session = await TableSession.findOne({
    where: { tableId, status: 'active' },
    order: [['openedAt', 'DESC']]
  });
  if (!session) return { attached: false, session: null, participant: null };

  const participant = await TableSessionDevice.findOne({
    where: { tableSessionId: session.id, deviceId }
  });
  return { attached: !!participant, session, participant };
}

// ─── Sprint 5.8 — mesas activas + liberación manual ──────────────────────

// Balance pendiente de una sesión en cents: sum(Order.totalCents) -
// sum(Payment.paid.subtotalCents). Las propinas NO entran (decisión Sprint 5).
// Espejo de _outstandingBalanceCents en services/payments.js, replicado acá
// para no acoplar los services (payments no depende de sessions ni viceversa).
async function _sessionBalanceCents(tableSessionId, { transaction } = {}) {
  const orderSum = (await Order.sum('totalCents', {
    where: { tableSessionId },
    transaction
  })) || 0;
  const paidSubtotalSum = (await Payment.sum('subtotalCents', {
    where: { tableSessionId, status: 'paid' },
    transaction
  })) || 0;
  return {
    orderTotalCents: orderSum,
    paidCents: paidSubtotalSum,
    balanceCents: Math.max(orderSum - paidSubtotalSum, 0)
  };
}

// Lista las sesiones activas del branch con su balance pendiente. Alimenta la
// sección "Mesas activas" de CajaShell (Sprint 5.8), donde el cajero puede
// liberar una mesa manualmente. Ordenadas por apertura (la más vieja arriba).
async function listActiveSessionsForBranch(branchId) {
  const sessions = await TableSession.findAll({
    where: { status: 'active' },
    include: [{
      model: Table,
      as: 'table',
      where: { branchId },
      attributes: ['id', 'tableName', 'branchId'],
      required: true
    }],
    order: [['openedAt', 'ASC']]
  });

  const rows = await Promise.all(sessions.map(async (session) => {
    const balance = await _sessionBalanceCents(session.id);
    return {
      sessionId: session.id,
      tableId: session.tableId,
      tableName: session.table ? session.table.tableName : null,
      openedAt: session.openedAt,
      ...balance
    };
  }));

  // Solo mesas con consumo (al menos un pedido). Las "scan-only" — el cliente
  // escaneó el QR y se creó la sesión + OCCUPY en el mount de UserScreen, pero
  // nunca pidió — no tienen acción ni para el mozo ni para el cajero, así que
  // no las listamos para liberar (serían ruido). Las sesiones abandonadas sin
  // consumo las limpia el auto-zombie de Sprint 6.
  return rows.filter(r => r.orderTotalCents > 0);
}

// Crea un Event VACATE auto-seen para que la mesa figure libre en el piso
// (mismo patrón que release-all-tables y el inverso de OCCUPY en attach).
// No-op si la company no tiene VACATE seedeado. Corre dentro de la transacción
// del caller.
async function _emitVacate({ tableId, companyId, userId, transaction }) {
  const vacateEventType = await EventType.findOne({
    where: { companyId, systemEventType: 'VACATE', isActive: true },
    transaction
  });
  if (!vacateEventType) return;
  const now = new Date();
  await Event.create({
    tableId,
    eventTypeId: vacateEventType.id,
    message: null,
    createdAt: now,
    seenAt: now,
    userId: userId || null
  }, { transaction });
}

// Liberación manual individual de una mesa (Sprint 5.8). Para casos edge donde
// el balance sigue > 0: walkout, cobro off-system, comp del dueño. Cierra la
// sesión activa (status=closed + closedAt + closedByUserId + releaseReason),
// marca todos los eventos pendientes como vistos y dispara un VACATE para que
// la mesa quede libre en el piso. Idempotente-ish: si no hay sesión activa
// igual limpia eventos + VACATE (la mesa pudo quedar ocupada solo en el modelo
// legacy de eventos).
//
// Permiso lo chequea el route (waiter/cashier/owner + acceso al branch).
async function releaseTable({ tableId, userId, releaseReason }) {
  const table = await Table.findByPk(tableId, {
    include: [{ model: Branch, include: [{ model: Company }] }]
  });
  if (!table) {
    const err = new Error('Mesa no encontrada');
    err.statusCode = 404;
    throw err;
  }
  const companyId = table.Branch && table.Branch.Company && table.Branch.Company.id;
  const reason = (typeof releaseReason === 'string' && releaseReason.trim())
    ? releaseReason.trim().slice(0, 1024)
    : null;

  const t = await sequelize.transaction();
  try {
    const now = new Date();

    const session = await TableSession.findOne({
      where: { tableId, status: 'active' },
      order: [['openedAt', 'DESC']],
      transaction: t
    });

    let balance = { orderTotalCents: 0, paidCents: 0, balanceCents: 0 };
    if (session) {
      balance = await _sessionBalanceCents(session.id, { transaction: t });
      await session.update({
        status: 'closed',
        closedAt: now,
        closedByUserId: userId || null,
        releaseReason: reason
      }, { transaction: t });

      // Cancelar los pedidos pendientes de la sesión: si no, sus AlertCards
      // purple "Nuevo Pedido" quedan colgadas en el piso (listActiveOrders
      // filtra por status='pending', no por estado de la sesión). Liberar la
      // mesa = la sesión terminó, esos pedidos ya no son accionables.
      await Order.update(
        { status: 'cancelled' },
        { where: { tableSessionId: session.id, status: 'pending' }, transaction: t }
      );
    }

    // Limpiar el piso: marcar pendientes como vistos + VACATE.
    await Event.update(
      { seenAt: now },
      { where: { tableId, seenAt: null }, transaction: t }
    );
    if (companyId) {
      await _emitVacate({ tableId, companyId, userId, transaction: t });
    }

    await t.commit();
    return {
      tableId,
      sessionId: session ? session.id : null,
      released: true,
      releaseReason: reason,
      balanceCentsAtRelease: balance.balanceCents
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  attachDeviceToTable,
  ensureActiveSessionForStaff,
  getActiveSession,
  isDeviceAttached,
  listActiveSessionsForBranch,
  releaseTable
};
