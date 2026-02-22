const mongoose = require('mongoose');

const HealthSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },   // YYYY-MM-DD — one doc per day
    habits: { type: Map, of: Boolean, default: {} },  // { "Morning Walk": true, ... }
    mood: { type: String, default: null },    // emoji string e.g. "😊"
    moodNote: { type: String, default: '' },
    sleep: {
        bedtime: { type: String, default: '' },
        wakeup: { type: String, default: '' },
    },
    energy: { type: Number, default: 0, min: 0, max: 5 },
}, { timestamps: true });

// One health record per user per day
HealthSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Health', HealthSchema);
