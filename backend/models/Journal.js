const mongoose = require('mongoose');

// Daily journal — separate from quick captures, longer-form reflection
const JournalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },  // YYYY-MM-DD
    content: { type: String, default: '' },
    mood: { type: String, enum: ['😄', '🙂', '😐', '😔', '😤'], default: '🙂' },
    tags: [{ type: String }],
    isPrivate: { type: Boolean, default: true },
    wordCount: { type: Number, default: 0 },
}, { timestamps: true });

JournalSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Journal', JournalSchema);
