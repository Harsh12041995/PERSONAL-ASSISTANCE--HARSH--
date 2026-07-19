const mongoose = require('mongoose');

// A portfolio entity. The unit of the Friday kill review: every project is
// explicitly active, parked, killed, or done — nothing lives "in your head".
const ProjectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'parked', 'killed', 'done'], default: 'active' },
    // The single next action — resuming a parked project should take minutes.
    nextAction: { type: String, default: '' },
    tractionSignal: { type: String, default: '' },
    attentionCost: { type: Number, min: 1, max: 5, default: 3 },
    tags: { type: [String], default: [] },
    links: {
        repo: { type: String, default: '' },      // owner/name or full URL
        deploy: { type: String, default: '' },
        docs: { type: String, default: '' },
    },
    // GitHub repo in "owner/name" form; webhook events match on this.
    githubRepo: { type: String, default: '', index: true },
    lastActivityAt: { type: Date, default: null },
    statusChangedAt: { type: Date, default: Date.now },
}, { timestamps: true });

ProjectSchema.index({ userId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Project', ProjectSchema);
