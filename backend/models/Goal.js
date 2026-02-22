const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema({
    text: String,
    done: { type: Boolean, default: false },
}, { _id: true });

const GoalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    area: { type: String, default: 'Personal' },
    emoji: { type: String, default: '🎯' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    deadline: { type: String, default: null },   // YYYY-MM-DD
    milestones: [MilestoneSchema],
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema);
