// Service del Club VIP del cliente (Sprint 5.9 — captura + conteo de visitas;
// Sprint 5.11 — vouchers).
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
// Vouchers (Sprint 5.11):
//   - Generación automática: al contar una visita que deja visits >= clubGoal,
//     si el member no tiene ya un Voucher sin canjear, generamos uno (snapshot
//     del clubReward). visits NO se resetea acá — el reset es al canjear.
//   - Detección "próxima visita": el device que tipeó el teléfono queda
//     vinculado (ClubMemberDevice). Al escanear el QR resolvemos su voucher
//     pendiente por device (getPendingVoucherForDevice) y se lo mostramos.
//   - Canje: el mozo valida el código desde OpShell (redeemVoucher) → marca
//     redeemedAt/redeemedByUserId + resetea member.visits = 0.

const sequelize = require('../config/database');
const {
  Payment,
  TableSession,
  Table,
  Branch,
  ClubMember,
  ClubVisit,
  Voucher,
  ClubMemberDevice
} = require('../models');

// Alfabeto sin caracteres ambiguos (sin 0/O/1/I/L) — el mozo tipea el código
// a mano desde OpShell, así que minimizamos confusiones de lectura.
const VOUCHER_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function _randomCode(len) {
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += VOUCHER_ALPHABET[Math.floor(Math.random() * VOUCHER_ALPHABET.length)];
  }
  return s;
}

// Genera un código único (chequea colisión contra Voucher.code, que tiene
// índice unique). 6 chars dan ~887M combinaciones — colisión casi imposible,
// pero reintentamos por las dudas y caemos a 8 chars como red final.
async function _uniqueVoucherCode(transaction) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = _randomCode(6);
    const clash = await Voucher.findOne({ where: { code }, transaction });
    if (!clash) return code;
  }
  return _randomCode(8);
}

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

// Vincula el device (cookie hm_device) al member. Idempotente. Solo el device
// que efectivamente tipeó el teléfono queda vinculado → al escanear, ese device
// ve su voucher (un comensal de la misma mesa no ve el premio ajeno).
async function _linkDevice(clubMemberId, deviceId, transaction) {
  if (!deviceId) return;
  await ClubMemberDevice.findOrCreate({
    where: { clubMemberId, deviceId },
    defaults: { clubMemberId, deviceId },
    transaction
  });
}

// Resuelve el voucher pendiente del member: si ya tiene uno sin canjear lo
// devuelve (no duplica); si alcanzó el goal y no tiene ninguno, lo genera.
// Devuelve { voucher, justGenerated }. No toca member.visits (el reset es al
// canjear).
async function _resolveVoucherAtGoal(member, branch, transaction) {
  const existing = await Voucher.findOne({
    where: { clubMemberId: member.id, redeemedAt: null },
    order: [['generatedAt', 'DESC']],
    transaction
  });
  if (existing) return { voucher: existing, justGenerated: false };

  const goal = branch.clubGoal;
  if (goal == null || member.visits < goal) {
    return { voucher: null, justGenerated: false };
  }

  const code = await _uniqueVoucherCode(transaction);
  const voucher = await Voucher.create({
    clubMemberId: member.id,
    code,
    reward: branch.clubReward || 'Premio',
    generatedAt: new Date()
  }, { transaction });
  return { voucher, justGenerated: true };
}

function _voucherPayload(voucher) {
  if (!voucher) return null;
  return { code: voucher.code, reward: voucher.reward };
}

// Listado de socios del Club VIP de un branch para el tab Club de la CajaShell
// (Sprint 5.10). Devuelve la config del programa (goal/reward + nombre del
// branch para el mensaje) y todos los members con sus visitas, última visita y
// — Sprint 5.11 — su voucher pendiente (código + premio) si lo tienen, para que
// el mensaje de WhatsApp pueda incluir el código de canje. El frontend filtra
// (búsqueda, días sin volver, voucher) y arma los links `wa.me/...` client-side.
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

  // Vouchers pendientes (sin canjear) de estos members, el más reciente por
  // member (en el MVP hay a lo sumo uno activo, pero ordenamos por las dudas).
  const memberIds = members.map((m) => m.id);
  const vouchers = memberIds.length
    ? await Voucher.findAll({
      where: { clubMemberId: memberIds, redeemedAt: null },
      attributes: ['clubMemberId', 'code', 'reward', 'generatedAt'],
      order: [['generatedAt', 'DESC']]
    })
    : [];
  const voucherByMember = new Map();
  for (const v of vouchers) {
    if (!voucherByMember.has(v.clubMemberId)) voucherByMember.set(v.clubMemberId, v);
  }

  const goal = branch.clubGoal;
  return {
    branchName: branch.name,
    goal,
    reward: branch.clubReward,
    members: members.map((m) => {
      const v = voucherByMember.get(m.id) || null;
      return {
        id: m.id,
        phone: m.phone,
        visits: m.visits,
        lastVisitAt: m.lastVisitAt,
        joinedAt: m.createdAt,
        reachedGoal: goal != null && m.visits >= goal,
        hasPendingVoucher: !!v,
        voucherCode: v ? v.code : null,
        voucherReward: v ? v.reward : null
      };
    })
  };
}

// Estado del Club para una sesión: si ya se registró visita devuelve el
// contador; si no, null. Usado por el contexto PostPago para mostrar el
// estado "ya sos parte, X de Y" sin volver a contar. Incluye el voucher
// pendiente del member (si lo tiene) para recordárselo en PostPago.
async function getClubStatusForSession(tableSessionId) {
  const visit = await ClubVisit.findOne({
    where: { tableSessionId },
    include: [{ model: ClubMember, as: 'member' }]
  });
  if (!visit || !visit.member) return null;
  const branch = await Branch.findByPk(visit.member.branchId, {
    attributes: ['clubGoal', 'clubReward']
  });
  const voucher = await Voucher.findOne({
    where: { clubMemberId: visit.member.id, redeemedAt: null },
    order: [['generatedAt', 'DESC']]
  });
  return {
    joined: true,
    visits: visit.member.visits,
    goal: branch ? branch.clubGoal : null,
    reward: branch ? branch.clubReward : null,
    voucher: _voucherPayload(voucher)
  };
}

// El cliente se une al Club / registra su visita.
async function joinClub({ paymentId, phone, deviceId = null }) {
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
      await _linkDevice(existingVisit.member.id, deviceId, transaction);
      const { voucher } = await _resolveVoucherAtGoal(existingVisit.member, branch, transaction);
      return {
        alreadyJoined: true,
        counted: true,
        visits: existingVisit.member.visits,
        goal: branch.clubGoal,
        reward: branch.clubReward,
        voucher: _voucherPayload(voucher),
        voucherJustGenerated: false
      };
    }

    // Upsert del member por (branchId, phone).
    let [member] = await ClubMember.findOrCreate({
      where: { branchId, phone: cleanPhone },
      defaults: { branchId, phone: cleanPhone, visits: 0, lastVisitAt: null },
      transaction
    });

    await _linkDevice(member.id, deviceId, transaction);

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
        const { voucher } = await _resolveVoucherAtGoal(member, branch, transaction);
        return {
          alreadyJoined: false,
          counted: false,
          cooldownActive: true,
          visits: member.visits,
          goal: branch.clubGoal,
          reward: branch.clubReward,
          voucher: _voucherPayload(voucher),
          voucherJustGenerated: false
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

    // Sprint 5.11: si esta visita alcanzó el goal, generamos el voucher.
    const { voucher, justGenerated } = await _resolveVoucherAtGoal(member, branch, transaction);

    return {
      alreadyJoined: false,
      counted: true,
      visits: member.visits,
      goal: branch.clubGoal,
      reward: branch.clubReward,
      voucher: _voucherPayload(voucher),
      voucherJustGenerated: justGenerated
    };
  });
}

// Sprint 5.11 — detección "próxima visita". Dado el device de la cookie y el
// branch de la mesa escaneada, devuelve el voucher pendiente del member
// vinculado a ese device (si lo hay). Se llama al cargar UserScreen. Devuelve
// null silenciosamente si no hay device, no hay member vinculado, o no hay
// voucher pendiente — es un endpoint best-effort, no bloquea el flujo.
async function getPendingVoucherForDevice(deviceId, branchId) {
  if (!deviceId || !branchId) return null;

  // Members de este device en este branch (el link se crea al hacer club-join).
  const links = await ClubMemberDevice.findAll({
    where: { deviceId },
    include: [{
      model: ClubMember,
      as: 'member',
      where: { branchId },
      attributes: ['id']
    }]
  });
  if (links.length === 0) return null;

  const memberIds = links.map((l) => l.member.id);
  const voucher = await Voucher.findOne({
    where: { clubMemberId: memberIds, redeemedAt: null },
    order: [['generatedAt', 'DESC']]
  });
  if (!voucher) return null;

  return {
    code: voucher.code,
    reward: voucher.reward,
    generatedAt: voucher.generatedAt
  };
}

// Sprint 5.11 — canje del voucher por el mozo desde OpShell. Valida el código,
// que pertenezca al branch del staff, y que no esté ya canjeado. Marca
// redeemedAt + redeemedByUserId y resetea member.visits = 0 (el multiplicador
// de aceleración se vuelve a aplicar en el nuevo ciclo).
async function redeemVoucher({ code, branchId, userId }) {
  const clean = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!clean) {
    const err = new Error('Ingresá un código de voucher');
    err.statusCode = 400;
    throw err;
  }

  return sequelize.transaction(async (transaction) => {
    const voucher = await Voucher.findOne({
      where: { code: clean },
      include: [{ model: ClubMember, as: 'member' }],
      transaction
    });
    if (!voucher || !voucher.member) {
      const err = new Error('Código inválido');
      err.statusCode = 404;
      throw err;
    }
    // Scoping: el voucher solo se canjea en la sucursal que lo emitió.
    if (voucher.member.branchId !== branchId) {
      const err = new Error('Este voucher es de otra sucursal');
      err.statusCode = 403;
      throw err;
    }
    if (voucher.redeemedAt) {
      const err = new Error('Este voucher ya fue canjeado');
      err.statusCode = 409;
      throw err;
    }

    const redeemedAt = new Date();
    await voucher.update({ redeemedAt, redeemedByUserId: userId }, { transaction });
    await voucher.member.update({ visits: 0 }, { transaction });

    return {
      code: voucher.code,
      reward: voucher.reward,
      phone: voucher.member.phone,
      redeemedAt,
      memberVisits: 0
    };
  });
}

module.exports = {
  listMembersForBranch,
  getClubStatusForSession,
  joinClub,
  getPendingVoucherForDevice,
  redeemVoucher
};
