const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const { Permission, Branch, User } = require('../models');
const logger = require('../utils/logger');

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:no-reply@heymozo.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push VAPID keys configured');
} else {
  console.warn('⚠️ VAPID keys not configured - push notifications disabled');
}

/**
 * Subscribe a user to push notifications
 */
async function subscribe(userId, subscription, branchId = null, userAgent = null) {
  try {
    // Check if subscription already exists (by endpoint)
    const existing = await PushSubscription.findOne({
      where: { endpoint: subscription.endpoint }
    });

    if (existing) {
      // Update existing subscription
      await existing.update({
        userId,
        branchId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
        userAgent,
        deletedAt: null
      });
      logger.info(`🔔 Push subscription updated for user ${userId}`);
      return existing;
    }

    // Create new subscription
    const pushSub = await PushSubscription.create({
      userId,
      branchId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      isActive: true,
      userAgent
    });

    logger.info(`🔔 Push subscription created for user ${userId}`);
    return pushSub;
  } catch (error) {
    logger.error('Error creating push subscription:', error);
    throw error;
  }
}

/**
 * Unsubscribe a user from push notifications
 */
async function unsubscribe(userId, endpoint) {
  try {
    const result = await PushSubscription.destroy({
      where: { userId, endpoint }
    });
    logger.info(`🔕 Push subscription removed for user ${userId}`);
    return result;
  } catch (error) {
    logger.error('Error removing push subscription:', error);
    throw error;
  }
}

/**
 * Send a push notification to a specific subscription
 */
async function sendToSubscription(subscription, payload) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid - deactivate it
      logger.info(`🔕 Subscription expired, deactivating: ${subscription.id}`);
      await PushSubscription.update(
        { isActive: false },
        { where: { id: subscription.id } }
      );
    } else {
      logger.error(`Error sending push to subscription ${subscription.id}:`, error);
    }
    return false;
  }
}

/**
 * Send push notification to all staff subscribed to a specific branch
 */
async function notifyBranchStaff(branchId, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn('Push notifications not configured, skipping');
    return;
  }

  try {
    // Get the branch to find the companyId
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      logger.error(`Branch ${branchId} not found for push notification`);
      return;
    }

    console.log(`🔔 Looking for push subscriptions for branch ${branchId}, company ${branch.companyId}`);

    // Get all active subscriptions
    const allActiveSubs = await PushSubscription.findAll({
      where: { isActive: true }
    });

    console.log(`🔔 Total active subscriptions: ${allActiveSubs.length}`);

    // Filter subscriptions: get those for this specific branch OR those with null branchId (global)
    // For global subs, verify user has permission for this company
    const validSubscriptions = [];

    for (const sub of allActiveSubs) {
      if (sub.branchId && sub.branchId === parseInt(branchId)) {
        // Subscribed to this specific branch
        validSubscriptions.push(sub);
        console.log(`🔔 Found branch-specific subscription: ${sub.id}`);
      } else if (!sub.branchId) {
        // Global subscription - check if user has permission for this company
        const userPermission = await Permission.findOne({
          where: {
            userId: sub.userId,
            resourceType: 'company',
            resourceId: branch.companyId
          }
        });

        if (userPermission) {
          validSubscriptions.push(sub);
          console.log(`🔔 Found global subscription with company permission: ${sub.id} (user ${sub.userId})`);
        }
      }
    }

    if (validSubscriptions.length === 0) {
      console.log(`🔔 No push subscriptions found for branch ${branchId}`);
      return;
    }

    console.log(`📤 Sending push notification to ${validSubscriptions.length} subscribers for branch ${branchId}`);

    // Send to all subscriptions in parallel
    const results = await Promise.allSettled(
      validSubscriptions.map(sub => sendToSubscription(sub, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - sent;

    console.log(`📤 Push notifications sent: ${sent} success, ${failed} failed`);
  } catch (error) {
    console.error('Error sending branch push notifications:', error);
  }
}

/**
 * Build a notification payload for a table event
 */
function buildEventPayload(eventType, table, branch, company) {
  const eventNames = {
    'CALL_WAITER': '🙋 Llamado de mozo',
    'REQUEST_CHECK': '💳 Pedir la cuenta',
    'CALL_MANAGER': '👔 Llamado de encargado',
    'SCAN': '📱 Escaneo de QR'
  };

  const title = eventNames[eventType] || `📢 ${eventType}`;
  const body = `Mesa ${table.name || table.id} - ${branch.name || 'Sucursal'}`;

  return {
    title,
    body,
    icon: '/images/heymozo-logo.png',
    badge: '/images/heymozo-logo.png',
    tag: `event-${table.id}-${eventType}`,
    data: {
      url: `/admin/${company.id}/${branch.id}`,
      tableId: table.id,
      branchId: branch.id,
      companyId: company.id,
      eventType
    },
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Descartar' }
    ]
  };
}

/**
 * Get all subscriptions for a user
 */
async function getUserSubscriptions(userId) {
  return PushSubscription.findAll({
    where: { userId, isActive: true },
    attributes: ['id', 'branchId', 'isActive', 'userAgent', 'createdAt']
  });
}

/**
 * Get the VAPID public key
 */
function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

module.exports = {
  subscribe,
  unsubscribe,
  sendToSubscription,
  notifyBranchStaff,
  buildEventPayload,
  getUserSubscriptions,
  getVapidPublicKey
};
