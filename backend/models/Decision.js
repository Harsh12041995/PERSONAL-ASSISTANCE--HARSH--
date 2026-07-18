const mongoose = require('mongoose');

// The decision journal. Tasks are cheap; decisions compound. Each entry gets a
// review date so past choices are re-examined instead of fossilizing.
const DecisionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    title: { type: String, required: true, trim: true },
    rationale: { type: String, default: '' },
    reviewAt: { type: String, default: '' },         // YYYY-MM-DD, optional
    outcome: { type: String, default: '' },          // filled at review time
    status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
}, { timestamps: true });

module.exports = mongoose.model('Decision', DecisionSchema);
