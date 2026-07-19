// backend/services/push.js
// Thin wrapper around web-push. Disabled gracefully when VAPID keys aren't set
// (endpoints report unavailable rather than crashing). Dead subscriptions
// (410/404) are pruned automatically on send.

const webpush = require('web-push');
const { env } = require('../config/env');
const { logger } = require('../config/logger');
const PushSubscription = require('../models/PushSubscription');

const enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (enabled) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

const isEnabled = () => enabled;
const publicKey = () => env.VAPID_PUBLIC_KEY;

/**
 * Send a push notification to every subscription a user has registered.
 * @param {string|ObjectId} userId
 * @param {{title:string, body:string, url?:string, tag?:string}} payload
 * @returns {Promise<{sent:number, pruned:number}>}
 */
async function sendToUser(userId, payload) {
    if (!enabled) return { sent: 0, pruned: 0 };
    const subs = await PushSubscription.find({ userId });
    let sent = 0, pruned = 0;
    const body = JSON.stringify(payload);
    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                body,
            );
            sent += 1;
        } catch (err) {
            // 404/410 => subscription expired or was revoked; drop it.
            if (err.statusCode === 404 || err.statusCode === 410) {
                await PushSubscription.deleteOne({ _id: sub._id });
                pruned += 1;
            } else {
                logger.warn({ err: err.message, userId: String(userId) }, 'Push send failed');
            }
        }
    }
    return { sent, pruned };
}

module.exports = { isEnabled, publicKey, sendToUser };
