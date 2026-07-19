const mongoose = require('mongoose');

const CaptureSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Idea', 'Task', 'Article', 'Follow-up', 'Money', 'Urgent', 'Journal'], default: 'Idea' },
    text: { type: String, required: true, trim: true },
    rawText: { type: String, trim: true },
    emoji: { type: String, default: '💡' },
    isRefined: { type: Boolean, default: false },
    // Where this capture came from (entry-point analytics).
    source: { type: String, default: '' },
    // Lifecycle: archived captures drop out of the default inbox view.
    archivedAt: { type: Date, default: null },
    // Link back to the record this capture was converted into.
    convertedTo: {
        kind: { type: String, enum: ['task', 'goal', 'event', null], default: null },
        id: { type: String, default: '' },
    },
}, { timestamps: true });

module.exports = mongoose.model('Capture', CaptureSchema);
