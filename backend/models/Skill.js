const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    level: { type: Number, min: 0, max: 100, default: 50 },  // percentage
    category: { type: String, default: 'Technical' },  // Technical, Soft, Domain
    emoji: { type: String, default: '⚡' },
}, { timestamps: true });

module.exports = mongoose.model('Skill', SkillSchema);
