const mongoose = require('mongoose');

const CaptureSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Idea', 'Task', 'Article', 'Follow-up', 'Money', 'Urgent', 'Journal'], default: 'Idea' },
    text: { type: String, required: true, trim: true },
    rawText: { type: String, trim: true },
    emoji: { type: String, default: '💡' },
    isRefined: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Capture', CaptureSchema);
