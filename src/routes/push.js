const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pushService = require('../services/pushNotification');

// All push routes require authentication
router.use(authMiddleware.authenticate);

// GET /api/push/vapid-public-key - Get the VAPID public key
router.get('/vapid-public-key', (req, res) => {
  const publicKey = pushService.getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey });
});

// POST /api/push/subscribe - Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription, branchId } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ error: 'Missing subscription keys' });
    }

    const userAgent = req.headers['user-agent'] || null;

    const pushSub = await pushService.subscribe(
      req.user.id,
      subscription,
      branchId || null,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'Suscripción activada correctamente',
      id: pushSub.id
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ error: 'Error al suscribirse a notificaciones' });
  }
});

// POST /api/push/unsubscribe - Unsubscribe from push notifications
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await pushService.unsubscribe(req.user.id, endpoint);

    res.json({
      success: true,
      message: 'Suscripción desactivada correctamente'
    });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    res.status(500).json({ error: 'Error al desuscribirse de notificaciones' });
  }
});

// GET /api/push/subscriptions - Get user's active subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await pushService.getUserSubscriptions(req.user.id);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

// POST /api/push/test - Send a test notification to the current user
router.post('/test', async (req, res) => {
  try {
    const subscriptions = await pushService.getUserSubscriptions(req.user.id);

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No hay suscripciones activas' });
    }

    const PushSubscription = require('../models/PushSubscription');
    const fullSubscriptions = await PushSubscription.findAll({
      where: { userId: req.user.id, isActive: true }
    });

    const payload = {
      title: '🔔 HeyMozo - Test',
      body: 'Las notificaciones push están funcionando correctamente!',
      icon: '/images/heymozo-logo.png',
      badge: '/images/heymozo-logo.png',
      tag: 'test-notification'
    };

    let sent = 0;
    for (const sub of fullSubscriptions) {
      const success = await pushService.sendToSubscription(sub, payload);
      if (success) sent++;
    }

    res.json({
      success: true,
      message: `Notificación enviada a ${sent}/${fullSubscriptions.length} dispositivos`
    });
  } catch (error) {
    console.error('Error sending test push:', error);
    res.status(500).json({ error: 'Error al enviar notificación de prueba' });
  }
});

module.exports = router;
