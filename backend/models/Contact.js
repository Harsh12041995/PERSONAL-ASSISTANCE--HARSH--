const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    relationship: { type: String, enum: ['Friend', 'Family', 'Colleague', 'Professional', 'Mentor', 'Other'], default: 'Friend' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    lastTalked: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    notes: { type: String, default: '' },
    followUpDays: { type: Number, default: 14 },  // How often to follow up (days)
    tags: [{ type: String }],
    socialLinks: {
        instagram: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        twitter: { type: String, default: '' },
    },
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema);
