const mongoose = require('mongoose');

// One ritual doc per day: a morning plan and an evening reflection.
const DailyRitualSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },   // YYYY-MM-DD (local)
    morning: {
        intention: { type: String, default: '' },        // one-line focus for the day
        priorities: [{ type: String }],                   // top 3 must-dos
        done: { type: Boolean, default: false },
    },
    evening: {
        wins: [{ type: String }],                         // what went well
        gratitude: { type: String, default: '' },
        tomorrow: { type: String, default: '' },          // one thing to carry forward
        rating: { type: Number, default: 0, min: 0, max: 5 },  // how the day felt
        done: { type: Boolean, default: false },
    },
}, { timestamps: true });

DailyRitualSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyRitual', DailyRitualSchema);
