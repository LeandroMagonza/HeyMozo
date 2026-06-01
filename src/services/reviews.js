// Service de reviews del cliente (Sprint 5.9 — PostPagoPage).
//
// Flujo: después de que un Payment llega a `paid`, el cliente cae en la
// pantalla PostPago y deja una valoración (1-5 estrellas). Si la nota es
// baja (<= 3) puede sumar tags negativos + comentario. El link a Google Maps
// aparece SIEMPRE post-submit (Google no permite filtrar reviews por nota,
// así que no podemos "esconder" las malas — decisión cerrada PHASE2_PLAN).
//
// Una Review por TableSession (idempotente). Híbrido D para el mozo: se
// auto-sugiere el que más Orders cargó en la sesión; el cliente puede
// cambiarlo a otro staff que tocó la mesa.

const sequelize = require('../config/database');
const {
  Payment,
  TableSession,
  Table,
  Branch,
  Order,
  User,
  Review,
  ReviewTag,
  ReviewTagAssignment
} = require('../models');

// Umbral por debajo del cual se habilitan tags negativos + comentario.
const LOW_RATING_THRESHOLD = 3;

// Carga el Payment con su sesión + mesa. Lanza 404 si no existe.
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

// Devuelve el staff que tocó la mesa en esta sesión (los que cargaron Orders
// en persona) + el mozo sugerido (el que más Orders cargó). Si la sesión solo
// tiene pedidos del cliente (createdByUserId null), devuelve lista vacía y
// suggestedWaiterId null → el front no muestra selector de mozo.
async function _resolveSessionStaff(tableSessionId) {
  const orders = await Order.findAll({
    where: { tableSessionId },
    attributes: ['createdByUserId'],
    include: [{
      model: User,
      as: 'createdByUser',
      attributes: ['id', 'name', 'email']
    }]
  });

  const counts = new Map();   // userId -> { user, orders }
  for (const order of orders) {
    const u = order.createdByUser;
    if (!u) continue;
    const entry = counts.get(u.id) || { user: u, orders: 0 };
    entry.orders += 1;
    counts.set(u.id, entry);
  }

  const staff = [...counts.values()].map(({ user }) => ({
    id: user.id,
    name: user.name || user.email
  }));

  let suggestedWaiterId = null;
  let max = -1;
  for (const { user, orders: n } of counts.values()) {
    if (n > max) { max = n; suggestedWaiterId = user.id; }
  }

  return { staff, suggestedWaiterId };
}

// Contexto completo para la pantalla PostPago a partir de un Payment.
async function getPostpagoContext(paymentId) {
  const payment = await _loadPaymentSession(paymentId);
  const session = payment.session;
  const branch = await Branch.findByPk(session.table.branchId);
  if (!branch) {
    const err = new Error('Branch no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const tags = await ReviewTag.findAll({
    where: { branchId: branch.id, isActive: true, sentiment: 'negative' },
    attributes: ['id', 'name', 'emoji'],
    order: [['id', 'ASC']]
  });

  const { staff, suggestedWaiterId } = await _resolveSessionStaff(session.id);

  const existing = await Review.findOne({
    where: { tableSessionId: session.id },
    include: [{ model: ReviewTag, as: 'tags', attributes: ['id'] }]
  });

  return {
    payment: {
      id: payment.id,
      method: payment.method,
      status: payment.status,
      subtotalCents: payment.subtotalCents,
      tipCents: payment.tipCents,
      totalCents: payment.totalCents
    },
    branch: {
      id: branch.id,
      name: branch.name,
      googleMapsReviewUrl: branch.googleMapsReviewUrl || null
    },
    club: {
      reward: branch.clubReward,
      goal: branch.clubGoal
    },
    tags: tags.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji })),
    staff,
    suggestedWaiterId,
    existingReview: existing
      ? {
          id: existing.id,
          stars: existing.stars,
          comment: existing.comment,
          waiterId: existing.waiterId,
          derivedToGoogle: existing.derivedToGoogle,
          tagIds: (existing.tags || []).map((t) => t.id)
        }
      : null
  };
}

// Crea la Review de la sesión. Idempotente: si ya existe, devuelve 409.
//
// Reglas (PHASE2_PLAN §PostPagoPage):
//   - stars 1..5 obligatorio.
//   - stars <= 3: se aceptan tagIds (negativos del branch) + comment.
//   - stars >= 4: se ignoran tags y comment (cero ruido).
//   - waiterId solo se acepta si pertenece al staff que tocó la mesa.
async function submitReview({ paymentId, stars, comment, tagIds = [], waiterId = null }) {
  const starsInt = parseInt(stars, 10);
  if (!Number.isFinite(starsInt) || starsInt < 1 || starsInt > 5) {
    const err = new Error('stars debe ser un entero entre 1 y 5');
    err.statusCode = 400;
    throw err;
  }

  const payment = await _loadPaymentSession(paymentId);
  const session = payment.session;
  const branchId = session.table.branchId;

  const already = await Review.findOne({ where: { tableSessionId: session.id } });
  if (already) {
    const err = new Error('Esta sesión ya tiene una valoración');
    err.statusCode = 409;
    throw err;
  }

  const isLow = starsInt <= LOW_RATING_THRESHOLD;

  // Validar waiterId contra el staff real de la mesa.
  const { staff } = await _resolveSessionStaff(session.id);
  const staffIds = new Set(staff.map((s) => s.id));
  const cleanWaiterId = waiterId && staffIds.has(parseInt(waiterId, 10))
    ? parseInt(waiterId, 10)
    : null;

  // Validar tagIds: solo tags negativos activos del branch, y solo si stars<=3.
  let cleanTagIds = [];
  if (isLow && Array.isArray(tagIds) && tagIds.length > 0) {
    const validTags = await ReviewTag.findAll({
      where: { branchId, isActive: true, sentiment: 'negative' },
      attributes: ['id']
    });
    const validSet = new Set(validTags.map((t) => t.id));
    cleanTagIds = [...new Set(tagIds.map((id) => parseInt(id, 10)))]
      .filter((id) => validSet.has(id));
  }

  const cleanComment = isLow && typeof comment === 'string' && comment.trim()
    ? comment.trim().slice(0, 1000)
    : null;

  const review = await sequelize.transaction(async (transaction) => {
    const created = await Review.create({
      tableSessionId: session.id,
      paymentId: payment.id,
      stars: starsInt,
      comment: cleanComment,
      waiterId: cleanWaiterId,
      derivedToGoogle: false
    }, { transaction });

    if (cleanTagIds.length > 0) {
      await ReviewTagAssignment.bulkCreate(
        cleanTagIds.map((reviewTagId) => ({ reviewId: created.id, reviewTagId })),
        { transaction }
      );
    }

    return created;
  });

  return {
    id: review.id,
    stars: review.stars,
    comment: review.comment,
    waiterId: review.waiterId,
    derivedToGoogle: review.derivedToGoogle,
    tagIds: cleanTagIds
  };
}

// Marca que el cliente clickeó el link "Dejá tu valoración en Google Maps".
// Tracking puro (no bloquea nada). Idempotente.
async function markReviewDerivedToGoogle(reviewId) {
  const review = await Review.findByPk(reviewId);
  if (!review) {
    const err = new Error('Review no encontrada');
    err.statusCode = 404;
    throw err;
  }
  if (!review.derivedToGoogle) {
    await review.update({ derivedToGoogle: true });
  }
  return { id: review.id, derivedToGoogle: true, tableSessionId: review.tableSessionId };
}

module.exports = {
  LOW_RATING_THRESHOLD,
  getPostpagoContext,
  submitReview,
  markReviewDerivedToGoogle
};
