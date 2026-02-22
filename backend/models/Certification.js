const mongoose = require('mongoose');

const CertificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    issuer: { type: String, default: '' },
    emoji: { type: String, default: '🏆' },
    issued: { type: String, default: '' },   // YYYY-MM-DD
    expires: { type: String, default: '' },   // YYYY-MM-DD
    status: { type: String, enum: ['Active', 'Expired', 'In Progress'], default: 'Active' },
    credentialUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Certification', CertificationSchema);
