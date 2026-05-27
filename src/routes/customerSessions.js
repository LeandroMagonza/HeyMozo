// Customer-facing routes (sin JWT) — montadas en server.js ANTES del
// authMiddleware. La identidad del cliente vive en la cookie HttpOnly
// `hm_device` que se setea en /api/devices/identify.
//
// Endpoints (Sprint 3.2 — Pedido + identificación):
//   POST /api/devices/identify
//   POST /api/tables/:tableId/sessions/attach
//   GET  /api/tables/:tableId/session/active
//   POST /api/tables/:tableId/orders
//   GET  /api/orders/:orderId

const express = require('express');
const router = express.Router();

const deviceService = require('../services/devices');
const sessionService = require('../services/sessions');
const orderService = require('../services/orders');
const paymentService = require('../services/payments');
const mercadoPago = require('../services/mercadoPago');

const DEVICE_COOKIE = 'hm_device';

// Cookie del device — HttpOnly + SameSite Lax. Source of truth de la sesión
// del cliente (no la URL del QR). Secure solo en producción (TLS).
//
// SameSite=Lax (no Strict) porque el flujo MP nativo (Sprint 5.6) hace que
// el browser vuelva desde mercadopago.com.ar al back_url nuestro como una
// top-level navigation cross-site — con Strict la cookie no viaja y el
// endpoint /payments/:id/status devuelve 401 al cliente recién llegado.
// Lax permite la cookie en top-level GETs cross-site (que es lo que necesita
// el back_url) sin habilitarla para sub-requests cross-site (CSRF safe).
const deviceCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
  path: '/'
});

function readDeviceIdFromCookie(req) {
  const raw = req.cookies && req.cookies[DEVICE_COOKIE];
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

// POST /api/devices/identify — identifica o crea Device por fingerprint.
// Setea la cookie `hm_device` con el deviceId. Idempotente.
router.post('/devices/identify', async (req, res) => {
  try {
    const { fingerprint, name } = req.body || {};
    const device = await deviceService.identifyDevice({ fingerprint, name });

    res.cookie(DEVICE_COOKIE, String(device.id), deviceCookieOptions());
    res.json({
      id: device.id,
      emoji: device.emoji,
      name: device.name
    });
  } catch (err) {
    console.error('❌ /devices/identify:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error identifying device' });
  }
});

// POST /api/tables/:tableId/sessions/attach — adjunta el device de la cookie
// a la sesión activa de la mesa (o crea sesión nueva si no había). Sin
// aprobación: primer device es leader, subsecuentes son followers automáticos
// (aprobación transitiva queda para Sprint 6).
router.post('/tables/:tableId/sessions/attach', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado. Llamar a /api/devices/identify primero.' });
    }
    const tableId = parseInt(req.params.tableId, 10);
    if (!Number.isFinite(tableId)) {
      return res.status(400).json({ error: 'tableId inválido' });
    }

    const result = await sessionService.attachDeviceToTable({ tableId, deviceId });
    res.json({
      session: {
        id: result.session.id,
        tableId: result.session.tableId,
        status: result.session.status,
        openedAt: result.session.openedAt,
        leaderDeviceId: result.session.leaderDeviceId
      },
      participant: {
        deviceId: result.participant.deviceId,
        isLeader: result.participant.isLeader,
        joinedAt: result.participant.joinedAt
      },
      isNewSession: result.isNewSession,
      isNewParticipant: result.isNewParticipant
    });
  } catch (err) {
    console.error('❌ /tables/:tableId/sessions/attach:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error attaching session' });
  }
});

// GET /api/tables/:tableId/session/active — devuelve la sesión activa de la
// mesa con sus participantes (emojis para mostrar quién está conectado).
router.get('/tables/:tableId/session/active', async (req, res) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    if (!Number.isFinite(tableId)) {
      return res.status(400).json({ error: 'tableId inválido' });
    }
    const session = await sessionService.getActiveSession(tableId);
    if (!session) {
      return res.json({ session: null });
    }
    res.json({
      session: {
        id: session.id,
        tableId: session.tableId,
        status: session.status,
        openedAt: session.openedAt,
        leaderDeviceId: session.leaderDeviceId,
        participants: (session.participants || []).map((p) => ({
          deviceId: p.deviceId,
          isLeader: p.isLeader,
          emoji: p.device && p.device.emoji,
          name: p.device && p.device.name,
          joinedAt: p.joinedAt
        }))
      }
    });
  } catch (err) {
    console.error('❌ /tables/:tableId/session/active:', err.message);
    res.status(500).json({ error: 'Error fetching session' });
  }
});

// POST /api/tables/:tableId/orders — cliente confirma carrito.
// Requiere device cookie + sesión activa adjunta.
// Lógica de merge en orderService.confirmOrder.
router.post('/tables/:tableId/orders', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado' });
    }
    const tableId = parseInt(req.params.tableId, 10);
    if (!Number.isFinite(tableId)) {
      return res.status(400).json({ error: 'tableId inválido' });
    }

    const { attached, session } = await sessionService.isDeviceAttached({ tableId, deviceId });
    if (!attached) {
      return res.status(403).json({
        error: 'Device no está adjunto a la sesión de esta mesa. Llamar a /sessions/attach primero.'
      });
    }

    const { items, notes } = req.body || {};
    const order = await orderService.confirmOrder({
      tableId,
      deviceId,
      tableSessionId: session.id,
      items,
      notes
    });
    res.status(201).json(order);
  } catch (err) {
    console.error('❌ POST /tables/:tableId/orders:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error confirming order' });
  }
});

// GET /api/tables/:tableId/orders — historial de pedidos de la sesión activa
// para el device de la cookie. Prerequisito de Pagos digitales (Sprint 7).
// Devuelve [] si el device no tiene sesión activa en esta mesa.
router.get('/tables/:tableId/orders', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado' });
    }
    const tableId = parseInt(req.params.tableId, 10);
    if (!Number.isFinite(tableId)) {
      return res.status(400).json({ error: 'tableId inválido' });
    }

    const orders = await orderService.listSessionOrders({ tableId, deviceId });
    res.json({ orders });
  } catch (err) {
    console.error('❌ GET /tables/:tableId/orders:', err.message);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// GET /api/orders/:orderId — el cliente polling para saber si su pedido fue
// marcado como ready ("PEDIDO LISTO" en pantalla del Sprint 3.3).
// Verifica que el device de la cookie haya participado en la sesión del order.
router.get('/orders/:orderId', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado' });
    }
    const orderId = parseInt(req.params.orderId, 10);
    if (!Number.isFinite(orderId)) {
      return res.status(400).json({ error: 'orderId inválido' });
    }
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order no encontrado' });
    }

    // Authorization: device debe pertenecer a la sesión del order.
    const { TableSessionDevice } = require('../models');
    const participation = await TableSessionDevice.findOne({
      where: { tableSessionId: order.tableSessionId, deviceId }
    });
    if (!participation) {
      return res.status(403).json({ error: 'Device no tiene acceso a este pedido' });
    }

    res.json(order);
  } catch (err) {
    console.error('❌ GET /orders/:orderId:', err.message);
    res.status(500).json({ error: 'Error fetching order' });
  }
});

// ─── Sprint 5.4: pagos cash / tarjeta (cliente) ─────────────────────────────

// POST /api/tables/:tableId/payments — cliente solicita cobro cash/tarjeta.
// Body: { method: 'cash' | 'card_terminal', tipCents }
// Backend calcula subtotalCents = balance pendiente. Crea Event (alerta OpShell)
// + Payment(pending). Devuelve el Payment para redirect a /waiting-payment/:id.
router.post('/tables/:tableId/payments', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado' });
    }
    const tableId = parseInt(req.params.tableId, 10);
    if (!Number.isFinite(tableId)) {
      return res.status(400).json({ error: 'tableId inválido' });
    }

    const { attached, session } = await sessionService.isDeviceAttached({ tableId, deviceId });
    if (!attached) {
      return res.status(403).json({
        error: 'Device no está adjunto a la sesión de esta mesa'
      });
    }

    const { method, tipCents } = req.body || {};
    const payment = await paymentService.requestPayment({
      tableId,
      deviceId,
      tableSessionId: session.id,
      method,
      tipCents: Number(tipCents) || 0
    });

    const response = {
      id: payment.id,
      method: payment.method,
      status: payment.status,
      subtotalCents: payment.subtotalCents,
      tipCents: payment.tipCents,
      totalCents: payment.totalCents
    };

    // MP nativo: armar la preference y devolver el initPoint para que el
    // front haga `window.location.href = initPoint`. Si el cliente apretó
    // dos veces y `requestPayment` devolvió el Payment existente, recreamos
    // la preference igual — MP no expira preferences rápido pero el front
    // no las cachea. Idempotente del lado MP.
    if (payment.method === 'mp_native') {
      const { Branch, Table } = require('../models');
      const tableRow = await Table.findByPk(tableId, {
        include: [{ model: Branch, attributes: ['id', 'name', 'companyId', 'mpAccessToken'] }]
      });
      const branch = tableRow.Branch;
      const pref = await mercadoPago.createPreference({
        payment,
        branch,
        table: tableRow,
        companyId: branch.companyId,
        baseUrl: process.env.APP_BASE_URL
      });
      // Guardamos preferenceId en mpRawPayload para debugging — no es
      // source-of-truth (el webhook usa external_reference + payment_id query).
      await payment.update({
        mpRawPayload: { preferenceId: pref.preferenceId }
      });
      response.mpInitPoint = pref.initPoint;
      response.mpSandboxInitPoint = pref.sandboxInitPoint;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('❌ POST /tables/:tableId/payments:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error solicitando pago' });
  }
});

// GET /api/payments/:paymentId/status — polling cliente: ¿el mozo cobró ya?
// Verifica que el deviceId de la cookie sea el que creó el Payment (o sino
// cualquier device que esté en la TableSessionDevice — todos los participantes
// de la sesión deberían poder ver el estado del pago).
router.get('/payments/:paymentId/status', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado' });
    }
    const paymentId = parseInt(req.params.paymentId, 10);
    if (!Number.isFinite(paymentId)) {
      return res.status(400).json({ error: 'paymentId inválido' });
    }

    const payment = await paymentService.getPaymentForClient(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment no encontrado' });
    }

    // Authorization: device debe ser el creador o participante de la sesión.
    if (payment.deviceId && payment.deviceId === deviceId) {
      // owner del Payment — autorizado
    } else {
      const { TableSessionDevice } = require('../models');
      const participation = await TableSessionDevice.findOne({
        where: { tableSessionId: payment.tableSessionId, deviceId }
      });
      if (!participation) {
        return res.status(403).json({ error: 'Device sin acceso a este Payment' });
      }
    }

    res.json({
      id: payment.id,
      method: payment.method,
      status: payment.status,
      subtotalCents: payment.subtotalCents,
      tipCents: payment.tipCents,
      totalCents: payment.totalCents,
      paidAt: payment.paidAt
    });
  } catch (err) {
    console.error('❌ GET /payments/:paymentId/status:', err.message);
    res.status(500).json({ error: 'Error obteniendo estado del pago' });
  }
});

// GET /api/tables/:tableId/pending-payment — banner sticky del cliente.
// Devuelve { payment: {...} | null }. Polling cada ~4s. Cuando hay payment
// pending → banner visible; cuando transitó a paid/failed → null y el front
// redirige según corresponda.
router.get('/tables/:tableId/pending-payment', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.json({ payment: null });
    }
    const tableId = parseInt(req.params.tableId, 10);
    if (!Number.isFinite(tableId)) {
      return res.status(400).json({ error: 'tableId inválido' });
    }

    const { attached, session } = await sessionService.isDeviceAttached({ tableId, deviceId });
    if (!attached) {
      return res.json({ payment: null });
    }

    const payment = await paymentService.findPendingForSession(session.id);
    if (!payment) {
      return res.json({ payment: null });
    }

    res.json({
      payment: {
        id: payment.id,
        method: payment.method,
        status: payment.status,
        subtotalCents: payment.subtotalCents,
        tipCents: payment.tipCents,
        totalCents: payment.totalCents,
        deviceId: payment.deviceId
      }
    });
  } catch (err) {
    console.error('❌ GET /tables/:tableId/pending-payment:', err.message);
    res.status(500).json({ error: 'Error obteniendo pago pendiente' });
  }
});

// POST /api/payments/:paymentId/declare-paid — Sprint 5.5.
// Cliente avisa que ya transfirió (o pagó en MODO). Payment.pending →
// awaiting_validation. proofUrl opcional (super opcional: el cajero valida
// desde su app bancaria igual). Solo aplica a transfer/modo — cash/card
// se cierran por el endpoint /collect del mozo.
router.post('/payments/:paymentId/declare-paid', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado' });
    }
    const paymentId = parseInt(req.params.paymentId, 10);
    if (!Number.isFinite(paymentId)) {
      return res.status(400).json({ error: 'paymentId inválido' });
    }
    const { proofUrl } = req.body || {};
    const payment = await paymentService.declarePaid({ paymentId, deviceId, proofUrl });
    res.json({
      id: payment.id,
      method: payment.method,
      status: payment.status,
      proofUrl: payment.proofUrl
    });
  } catch (err) {
    console.error('❌ POST /payments/:paymentId/declare-paid:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error declarando pago' });
  }
});

// POST /api/payments/:paymentId/cancel — cliente cancela su Payment activo
// (pending o awaiting_validation). Marca Payment.failed + Event.seenAt si
// hay Event linkeado (cash/card). Para transfer/modo no hay Event.
router.post('/payments/:paymentId/cancel', async (req, res) => {
  try {
    const deviceId = readDeviceIdFromCookie(req);
    if (!deviceId) {
      return res.status(401).json({ error: 'Device no identificado' });
    }
    const paymentId = parseInt(req.params.paymentId, 10);
    if (!Number.isFinite(paymentId)) {
      return res.status(400).json({ error: 'paymentId inválido' });
    }

    const payment = await paymentService.cancelPayment({ paymentId, deviceId });
    res.json({ id: payment.id, status: payment.status });
  } catch (err) {
    console.error('❌ POST /payments/:paymentId/cancel:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error cancelando pago' });
  }
});

// ─── Sprint 5.6: webhook MP nativo ──────────────────────────────────────

// POST /api/payments/mp/webhook?payment_id=<local_id>&data.id=<mp_id>&type=payment
//
// Público (sin JWT). MP firma cada request con HMAC sobre
// `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Solo procesamos
// notificaciones type=payment — los demás (merchant_order, plan, etc.) los
// ignoramos respondiendo 200 (MP los reintentará si no responde 2xx, así
// que mejor 200 a callarlos).
//
// El query `payment_id` lo agregamos nosotros en `notification_url` al crear
// la preference — nos permite resolver el branch (y por ende el AT para
// hacer fetch del MP payment) sin tener que mapear MP user_id → branch.
router.post('/payments/mp/webhook', async (req, res) => {
  try {
    const type = req.query.type || (req.body && req.body.type);
    if (type && type !== 'payment') {
      // merchant_order / plan / subscription / etc. — no nos interesan.
      return res.status(200).json({ ignored: type });
    }

    // El id MP del payment viene como query `data.id` (preferido) o en el body.
    const dataId = req.query['data.id']
      || (req.query.data && req.query.data.id)
      || (req.body && req.body.data && req.body.data.id);

    // Verificación HMAC. MP envía:
    //   x-signature: "ts=1716000000000,v1=abcd..."
    //   x-request-id: "uuid"
    //
    // Escape hatch DEV-only: si `MP_SKIP_WEBHOOK_SIGNATURE=true` y no estamos
    // en prod, saltamos la verificación (loguea WARN). Útil cuando el secret
    // local todavía no está sincronizado con MP devs panel — desbloquea smoke
    // sin abrir un agujero en prod (donde NODE_ENV=production hace que esta
    // bandera se ignore).
    const skipSig = process.env.MP_SKIP_WEBHOOK_SIGNATURE === 'true'
      && process.env.NODE_ENV !== 'production';
    if (skipSig) {
      console.warn('⚠️  MP webhook: signature verification SKIPPED (DEV escape hatch).');
    } else {
      mercadoPago.verifyWebhookSignature({
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId,
        secret: process.env.MP_WEBHOOK_SECRET
      });
    }

    const localPaymentId = parseInt(req.query.payment_id, 10);
    if (!Number.isFinite(localPaymentId)) {
      console.warn('⚠️  MP webhook sin payment_id local — ignorado', { dataId });
      return res.status(200).json({ ignored: 'missing_payment_id' });
    }
    if (!dataId) {
      console.warn('⚠️  MP webhook sin data.id — ignorado', { localPaymentId });
      return res.status(200).json({ ignored: 'missing_data_id' });
    }

    // Resolvemos el branch a partir del Payment para usar el AT del venue
    // al hacer fetch del MP payment.
    const { Payment, TableSession, Table, Branch } = require('../models');
    const localPayment = await Payment.findByPk(localPaymentId, {
      include: [{
        model: TableSession,
        as: 'session',
        include: [{
          model: Table,
          as: 'table',
          include: [{ model: Branch, attributes: ['id', 'mpAccessToken'] }]
        }]
      }]
    });
    if (!localPayment) {
      console.warn(`⚠️  MP webhook: Payment local ${localPaymentId} no existe`);
      return res.status(200).json({ ignored: 'unknown_payment' });
    }
    const branch = localPayment.session && localPayment.session.table && localPayment.session.table.Branch;

    const mpPayment = await mercadoPago.fetchMpPayment({ branch, mpPaymentId: dataId });

    // Sanity check: external_reference debe matchear el id local (sino algo
    // se ensució entre la preference y este webhook).
    if (String(mpPayment.external_reference) !== String(localPaymentId)) {
      console.warn(
        `⚠️  MP webhook external_reference mismatch — query=${localPaymentId} ` +
        `mp.external_reference=${mpPayment.external_reference}. Ignorando.`
      );
      return res.status(200).json({ ignored: 'external_reference_mismatch' });
    }

    const nextStatus = mercadoPago.mapMpStatus(mpPayment.status);
    await paymentService.applyMpPayment({
      paymentId: localPaymentId,
      nextStatus,
      mpPaymentId: mpPayment.id,
      mpRawPayload: mpPayment
    });

    console.log(`💳 MP webhook OK — payment ${localPaymentId} → ${nextStatus || mpPayment.status}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    // 401 si fue firma inválida (MP reintenta menos sobre 4xx), 500 si fue
    // un bug nuestro (MP reintenta).
    const status = err.statusCode || 500;
    console.error(`❌ MP webhook ${status}:`, err.message);
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
