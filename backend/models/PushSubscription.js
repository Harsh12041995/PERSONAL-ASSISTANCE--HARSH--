const mongoose = require('mongoose');

// One row per browser/device push subscription. A user may have several
// (phone + laptop). `endpoint` is globally unique, so re-subscribing upserts.
const PushSubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
