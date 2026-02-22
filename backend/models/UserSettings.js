const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String, default: '' },
    bio: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    notifications: {
        dailyDigest: { type: Boolean, default: true },
        habitReminders: { type: Boolean, default: true },
        goalDeadlines: { type: Boolean, default: true },
        contactFollowUp: { type: Boolean, default: true },
    },
    geminiApiKey: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
}, { timestamps: true });

module.exports = mongoose.model('UserSettings', UserSettingsSchema);
