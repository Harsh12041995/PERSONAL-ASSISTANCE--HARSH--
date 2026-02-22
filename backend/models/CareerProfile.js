const mongoose = require('mongoose');

// ── Career Profile ─────────────────────────────────────────────────────────────
const CareerProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentRole: { type: String, default: '' },
    experienceYrs: { type: Number, default: 0 },
    linkedInUrl: { type: String, default: '' },
    naukriUrl: { type: String, default: '' },
    portfolioUrl: { type: String, default: '' },
    summary: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CareerProfile', CareerProfileSchema);
