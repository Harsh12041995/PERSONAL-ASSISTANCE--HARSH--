const mongoose = require('mongoose');

// Ingested activity from the outside world (GitHub pushes, RSS posts, manual
// notes). Feeds project lastActivityAt, the morning brief, and staleness checks.
const ActivityEventSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    source: { type: String, enum: ['github', 'rss', 'manual'], required: true },
    type: { type: String, default: 'event' },        // push | pull_request | issues | post | note
    summary: { type: String, required: true },
    url: { type: String, default: '' },
    occurredAt: { type: Date, default: Date.now },
}, { timestamps: true });

ActivityEventSchema.index({ userId: 1, occurredAt: -1 });

module.exports = mongoose.model('ActivityEvent', ActivityEventSchema);
