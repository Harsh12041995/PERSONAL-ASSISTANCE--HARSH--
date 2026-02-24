const mongoose = require('mongoose');

const AdminActivitySchema = new mongoose.Schema({
    actor: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, required: true }
    },
    action: { type: String, required: true, trim: true },
    target: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String },
        role: { type: String }
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AdminActivity', AdminActivitySchema);
