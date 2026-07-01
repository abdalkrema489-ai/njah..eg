// src/services/pushService.js
// Unified push notification service — supports:
//   • Web VAPID (browser / PWA) via push_subscriptions table
//   • Native FCM (Android / iOS Capacitor) via users.push_token
'use strict';

const webpush  = require('web-push');
const admin    = require('firebase-admin');
const { pool } = require('../config/postgres');
const logger   = require('../utils/logger');

// ── VAPID configuration ──────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@najah.eg'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  logger.info('✅ Web Push (VAPID) configured');
} else {
  logger.warn('⚠️  VAPID keys not set — web push notifications disabled');
}

/**
 * Send a push notification to a user on all their registered channels:
 *  1. Native FCM token (users.push_token) — for Capacitor Android/iOS
 *  2. Web VAPID subscriptions (push_subscriptions table) — for browser/PWA
 *
 * @param {string} userId
 * @param {{ title: string, body: string, link?: string, icon?: string }} payload
 */
async function sendPush(userId, { title, body, link = '/', icon = '/icon.png' }) {
  if (!userId) return;

  try {
    // Fetch native token + web subscriptions in one round-trip
    const [{ rows: userRows }, { rows: webSubs }] = await Promise.all([
      pool.query('SELECT push_token, push_platform FROM users WHERE id = $1', [userId]),
      pool.query(
        'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
        [userId]
      ),
    ]);

    const nativeToken = userRows[0]?.push_token;

    // ── 1. Native FCM (via firebase-admin messaging) ──
    if (nativeToken && admin.apps.length) {
      try {
        await admin.messaging().send({
          token: nativeToken,
          notification: { title, body },
          data: { link, icon },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });
      } catch (fcmErr) {
        if (
          fcmErr.code === 'messaging/registration-token-not-registered' ||
          fcmErr.code === 'messaging/invalid-registration-token'
        ) {
          // Stale token — clean up
          await pool
            .query('UPDATE users SET push_token = NULL WHERE id = $1', [userId])
            .catch(() => {});
          logger.info(`[Push] Removed stale FCM token for user ${userId}`);
        } else {
          logger.warn(`[Push] FCM send failed for user ${userId}: ${fcmErr.message}`);
        }
      }
    }

    // ── 2. Web VAPID subscriptions ──
    if (
      webSubs.length > 0 &&
      process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ) {
      const payloadStr = JSON.stringify({ title, body, link, icon });

      await Promise.all(
        webSubs.map(async (sub) => {
          const subscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          };
          try {
            await webpush.sendNotification(subscription, payloadStr);
          } catch (webErr) {
            // 410 Gone or 404 — subscription is no longer valid
            if (webErr.statusCode === 410 || webErr.statusCode === 404) {
              await pool
                .query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id])
                .catch(() => {});
              logger.info(`[Push] Removed stale web subscription ${sub.id}`);
            } else {
              logger.warn(
                `[Push] Web push failed for sub ${sub.id}: ${webErr.message}`
              );
            }
          }
        })
      );
    }
  } catch (err) {
    logger.error(`[Push] sendPush error for user ${userId}:`, err.message);
  }
}

module.exports = { sendPush };
