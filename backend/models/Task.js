const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    area: { type: String, default: 'Personal' },
    tab: { type: String, enum: ['today', 'week', 'someday'], default: 'today' },
    done: { type: Boolean, default: false },
    dueDate: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
