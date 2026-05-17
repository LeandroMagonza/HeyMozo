const { TableSession, TableSessionDevice, Table, Branch, Company, EventType, Event } = require('../models');

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

module.exports = {
  attachDeviceToTable,
  getActiveSession,
  isDeviceAttached
};
