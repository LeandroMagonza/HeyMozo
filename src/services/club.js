// Service del Club VIP del cliente (Sprint 5.9 — captura + conteo de visitas).
//
// El cliente deja su WhatsApp en la card del Club (siempre visible en
// PostPago). Al unirse: upsert del ClubMember por (branchId, phone), se
// registra UNA ClubVisit por TableSession (idempotente) y se incrementan
// las visitas — aplicando loyalty acceleration si corresponde.
//
// Integridad del conteo (anti-abuso, Sprint 5.10-hardening) — 3 capas:
//   1. Sesión: 1 ClubVisit por TableSession (recargar PostPago no farmea).
//   2. Pago paid: solo cuenta si el Payment está 'paid' (no en pending/failed).
//   3. Cooldown por member: si lastVisitAt está dentro de
//      branch.clubVisitCooldownHours (default 12h), NO suma — registra una
//      ClubVisit con visitsAdded=0 (idempotencia/auditoría) sin mover el
//      contador ni lastVisitAt, y devuelve cooldownActive=true.
//   El teléfono ES la identidad: meter otro teléfono arranca un contador en 0,
//   así que el fraude se castiga solo.
//
// Loyalty acceleration (endowed progress, PHASE2_PLAN §Club VIP): en la
// visita N == branch.clubAccelerationAtVisit se suma clubAccelerationMultiplier
// en lugar de 1.
//
// La GENERACIÓN del Voucher al alcanzar el goal queda para Sprint 5.11 — acá
// solo capturamos y contamos.

const sequelize = require('../config/database');
const {
  Payment,
  TableSession,
  Table,
  Branch,
  ClubMember,
  ClubVisit
} = require('../models');

// Normaliza el teléfono a solo dígitos (con prefijo país si vino). Sirve como
// clave estable del member dentro del branch y como destino `wa.me/<digits>`.
function _normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

async function _loadPaymentSession(paymentId) {
  const payment = await Payment.findByPk(paymentId, {
    include: [{
      model: TableSession,
      as: 'session',
      include: [{ model: Table, as: 'table' }]
    }]
  });
  if (!payment) {
    const err = new Error('Payment no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (!payment.session) {
    const err = new Error('Payment sin sesión asociada');
    err.statusCode = 409;
    throw err;
  }
  return payment;
}

// Listado de socios del Club VIP de un branch para el tab Club de la CajaShell
// (Sprint 5.10). Devuelve la config del programa (goal/reward + nombre del
// branch para el mensaje) y todos los members con sus visitas y última visita.
// El frontend filtra (búsqueda por teléfono, días sin volver, voucher
// alcanzado) y arma los links `wa.me/...` client-side — no paginamos ni
// filtramos en el server: el dataset por branch es chico en el MVP y filtrar
// en cliente hace el envío masivo instantáneo sobre el set visible.
async function listMembersForBranch(branchId) {
  const branch = await Branch.findByPk(branchId, {
    attributes: ['id', 'name', 'clubGoal', 'clubReward']
  });
  if (!branch) {
    const err = new Error('Branch no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const members = await ClubMember.findAll({
    where: { branchId },
    attributes: ['id', 'phone', 'visits', 'lastVisitAt', 'createdAt'],
    // Más recientes primero; los sin visita (lastVisitAt null) al final.
    order: [[sequelize.literal('"lastVisitAt" DESC NULLS LAST')]]
  });

  const goal = branch.clubGoal;
  return {
    branchName: branch.name,
    goal,
    reward: branch.clubReward,
    members: members.map((m) => ({
      id: m.id,
      phone: m.phone,
      visits: m.visits,
      lastVisitAt: m.lastVisitAt,
      joinedAt: m.createdAt,
      reachedGoal: goal != null && m.visits >= goal
    }))
  };
}

// Estado del Club para una sesión: si ya se registró visita devuelve el
// contador; si no, null. Usado por el contexto PostPago para mostrar el
// estado "ya sos parte, X de Y" sin volver a contar.
async function getClubStatusForSession(tableSessionId) {
  const visit = await ClubVisit.findOne({
    where: { tableSessionId },
    include: [{ model: ClubMember, as: 'member' }]
  });
  if (!visit || !visit.member) return null;
  const branch = await Branch.findByPk(visit.member.branchId, {
    attributes: ['clubGoal', 'clubReward']
  });
  return {
    joined: true,
    visits: visit.member.visits,
    goal: branch ? branch.clubGoal : null,
    reward: branch ? branch.clubReward : null
  };
}

// El cliente se une al Club / registra su visita.
async function joinClub({ paymentId, phone }) {
  const cleanPhone = _normalizePhone(phone);
  if (!cleanPhone) {
    const err = new Error('Teléfono inválido');
    err.statusCode = 400;
    throw err;
  }

  const payment = await _loadPaymentSession(paymentId);
  const session = payment.session;
  const branchId = session.table.branchId;

  // Capa 2: la visita solo cuenta contra un pago confirmado. Evita farmear
  // sobre pagos pending/failed/cancelados. (En el flujo normal PostPago se
  // alcanza recién con el pago paid, pero lo blindamos acá igual.)
  if (payment.status !== 'paid') {
    const err = new Error('El pago todavía no está confirmado');
    err.statusCode = 409;
    throw err;
  }

  const branch = await Branch.findByPk(branchId);
  if (!branch) {
    const err = new Error('Branch no encontrado');
    err.statusCode = 404;
    throw err;
  }

  return sequelize.transaction(async (transaction) => {
    // Idempotencia: una visita por sesión. Si ya hay visita registrada,
    // devolvemos el estado actual sin volver a contar (aunque cambie el
    // teléfono ingresado — la primera captura manda en esta sesión).
    const existingVisit = await ClubVisit.findOne({
      where: { tableSessionId: session.id },
      include: [{ model: ClubMember, as: 'member' }],
      transaction
    });
    if (existingVisit && existingVisit.member) {
      return {
        alreadyJoined: true,
        counted: true,
        visits: existingVisit.member.visits,
        goal: branch.clubGoal,
        reward: branch.clubReward
      };
    }

    // Upsert del member por (branchId, phone).
    let [member] = await ClubMember.findOrCreate({
      where: { branchId, phone: cleanPhone },
      defaults: { branchId, phone: cleanPhone, visits: 0, lastVisitAt: null },
      transaction
    });

    // Capa 3: cooldown por member. Si la última visita contada cae dentro de
    // la ventana del branch, NO sumamos: registramos una ClubVisit con
    // visitsAdded=0 (mantiene la idempotencia por sesión + deja rastro) sin
    // mover visits ni lastVisitAt (si moviéramos lastVisitAt, la ventana se
    // deslizaría sola y nunca cerraría). Un member recién creado tiene
    // lastVisitAt=null → no aplica cooldown → cuenta.
    const cooldownHours = branch.clubVisitCooldownHours ?? 12;
    if (member.lastVisitAt && cooldownHours > 0) {
      const elapsedMs = Date.now() - new Date(member.lastVisitAt).getTime();
      if (elapsedMs < cooldownHours * 3600 * 1000) {
        await ClubVisit.create({
          clubMemberId: member.id,
          tableSessionId: session.id,
          visitsAdded: 0
        }, { transaction });
        return {
          alreadyJoined: false,
          counted: false,
          cooldownActive: true,
          visits: member.visits,
          goal: branch.clubGoal,
          reward: branch.clubReward
        };
      }
    }

    // Loyalty acceleration: la visita que estamos por registrar es la
    // (visits + 1)-ésima. Si coincide con accelerationAtVisit, suma multiplier.
    const nthVisit = member.visits + 1;
    const accelAt = branch.clubAccelerationAtVisit;
    const visitsAdded = (accelAt && nthVisit === accelAt)
      ? branch.clubAccelerationMultiplier
      : 1;

    await ClubVisit.create({
      clubMemberId: member.id,
      tableSessionId: session.id,
      visitsAdded
    }, { transaction });

    member = await member.update({
      visits: member.visits + visitsAdded,
      lastVisitAt: new Date()
    }, { transaction });

    return {
      alreadyJoined: false,
      counted: true,
      visits: member.visits,
      goal: branch.clubGoal,
      reward: branch.clubReward
    };
  });
}

module.exports = {
  listMembersForBranch,
  getClubStatusForSession,
  joinClub
};
