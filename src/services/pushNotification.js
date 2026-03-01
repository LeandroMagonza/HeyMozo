const webpush = require('web-push');
const { Op } = require('sequelize');
const PushSubscription = require('../models/PushSubscription');
const { Permission, Branch, User } = require('../models');
const logger = require('../utils/logger');

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:no-reply@heymozo.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    console.log('Web Push VAPID keys configured');
  } catch (error) {
    console.error('Invalid VAPID keys - push notifications disabled:', error.message);
  }
} else {
  console.warn('VAPID keys not configured - push notifications disabled');
}

// Events that should NOT trigger push notifications (system/internal events)
const SKIP_PUSH_FOR = ['MARK_SEEN', 'VACATE', 'MARK_AVAILABLE', 'SCAN', 'OCCUPY'];

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
      logger.info(`Push subscription updated for user ${userId}`);
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

    logger.info(`Push subscription created for user ${userId}`);
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
    logger.info(`Push subscription removed for user ${userId}`);
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
      logger.info(`Subscription expired, deactivating: ${subscription.id}`);
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
 * Send push notification to all staff subscribed to a specific branch.
 * Uses efficient queries instead of N+1 pattern.
 */
async function notifyBranchStaff(branchId, payload) {
  if (!vapidConfigured) {
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

    // Query 1: Get subscriptions for this specific branch
    const branchSubs = await PushSubscription.findAll({
      where: { branchId: parseInt(branchId), isActive: true }
    });

    // Query 2: Get user IDs that have permission for this company
    const permittedUserIds = (await Permission.findAll({
      where: { resourceType: 'company', resourceId: branch.companyId },
      attributes: ['userId']
    })).map(p => p.userId);

    // Query 3: Get global subs (no branchId) for users with company permission
    const globalSubs = permittedUserIds.length > 0
      ? await PushSubscription.findAll({
          where: {
            branchId: null,
            isActive: true,
            userId: { [Op.in]: permittedUserIds }
          }
        })
      : [];

    const validSubscriptions = [...branchSubs, ...globalSubs];

    if (validSubscriptions.length === 0) {
      console.log(`No push subscriptions found for branch ${branchId}`);
      return;
    }

    console.log(`Sending push notification to ${validSubscriptions.length} subscribers for branch ${branchId}`);

    // Send to all subscriptions in parallel
    const results = await Promise.allSettled(
      validSubscriptions.map(sub => sendToSubscription(sub, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - sent;

    console.log(`Push notifications sent: ${sent} success, ${failed} failed`);
  } catch (error) {
    console.error('Error sending branch push notifications:', error);
  }
}

/**
 * Build a notification payload for a table event
 */
function buildEventPayload(eventType, table, branch, company) {
  const eventNames = {
    'CALL_WAITER': 'Llamado de mozo',
    'REQUEST_CHECK': 'Pedir la cuenta',
    'CALL_MANAGER': 'Llamado de encargado',
    'SCAN': 'Escaneo de QR'
  };

  const title = eventNames[eventType] || eventType;
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
 * Unified entry point for triggering push notifications on table events.
 * Called from both server.js and events.js event creation routes.
 * Fire-and-forget: never blocks the caller, never throws.
 */
function triggerEventPush(systemEventType, table) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  if (SKIP_PUSH_FOR.includes(systemEventType)) return;

  try {
    const payload = buildEventPayload(systemEventType, table, table.Branch, table.Branch.Company);
    notifyBranchStaff(table.Branch.id, payload).catch(err => {
      console.error('Push notification error:', err);
    });
  } catch (error) {
    console.error('Error building push payload:', error);
  }
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
  triggerEventPush,
  getUserSubscriptions,
  getVapidPublicKey
};
