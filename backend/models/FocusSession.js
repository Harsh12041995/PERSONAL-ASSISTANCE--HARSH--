const mongoose = require('mongoose');

// One completed (or in-progress) Pomodoro / deep-work block.
const FocusSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: 'Focus' },   // what you focused on
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    minutes: { type: Number, required: true, min: 1, max: 600 },
    date: { type: String, required: true },       // YYYY-MM-DD (local) for daily rollups
    completedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('FocusSession', FocusSessionSchema);
