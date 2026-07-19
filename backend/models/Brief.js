const mongoose = require('mongoose');

// A generated briefing (morning brief daily, portfolio memo on Fridays).
// The interface direction is inverted: briefings come to the user.
const BriefSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['morning', 'portfolio'], default: 'morning' },
    date: { type: String, required: true },          // YYYY-MM-DD
    content: { type: String, required: true },       // markdown
    // Whether the narrative came from the LLM or the deterministic fallback.
    generatedBy: { type: String, enum: ['llm', 'template'], default: 'template' },
    stats: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

BriefSchema.index({ userId: 1, kind: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Brief', BriefSchema);
