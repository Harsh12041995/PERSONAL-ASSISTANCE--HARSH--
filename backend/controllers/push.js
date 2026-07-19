// backend/controllers/push.js — Web Push subscription management (user-authed).
const PushSubscription = require('../models/PushSubscription');
const push = require('../services/push');

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, e) => res.status(500).json({ success: false, error: e.message });

// GET /personal/push/vapid — public key + whether push is configured server-side.
exports.getVapid = (req, res) => {
    ok(res, { enabled: push.isEnabled(), publicKey: push.publicKey() });
};

// POST /personal/push/subscribe — { endpoint, keys:{p256dh,auth} }
exports.subscribe = async (req, res) => {
    try {
        const { endpoint, keys } = req.body || {};
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ success: false, error: 'Invalid subscription payload' });
        }
        const sub = await PushSubscription.findOneAndUpdate(
            { endpoint },
            { userId: req.user._id, endpoint, keys, userAgent: req.headers['user-agent'] || '' },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        ok(res, { _id: sub._id });
    } catch (e) { fail(res, e); }
};

// POST /personal/push/unsubscribe — { endpoint }
exports.unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body || {};
        if (endpoint) await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
        ok(res, { removed: true });
    } catch (e) { fail(res, e); }
};

// POST /personal/push/test — send a test push to the caller's devices.
exports.sendTest = async (req, res) => {
    try {
        if (!push.isEnabled()) return res.status(503).json({ success: false, error: 'Push not configured on the server.' });
        const result = await push.sendToUser(req.user._id, {
            title: 'Personal Portal',
            body: '🔔 Push notifications are working!',
            url: '/',
            tag: 'test',
        });
        ok(res, result);
    } catch (e) { fail(res, e); }
};
