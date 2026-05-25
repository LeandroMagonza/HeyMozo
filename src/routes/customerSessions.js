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

const DEVICE_COOKIE = 'hm_device';

// Cookie del device — HttpOnly + SameSite Strict. Source of truth de la sesión
// del cliente (no la URL del QR). Secure solo en producción (TLS).
const deviceCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
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

    res.status(201).json({
      id: payment.id,
      method: payment.method,
      status: payment.status,
      subtotalCents: payment.subtotalCents,
      tipCents: payment.tipCents,
      totalCents: payment.totalCents
    });
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

// POST /api/payments/:paymentId/cancel — cliente cancela su Payment pending.
// Marca Payment.failed + Event.seenAt (la AlertCard del mozo desaparece).
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

module.exports = router;
