const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    notifications: {
        dailyDigest: { type: Boolean, default: true },
        habitReminders: { type: Boolean, default: true },
        goalDeadlines: { type: Boolean, default: true },
        contactFollowUp: { type: Boolean, default: true },
    },
    integrations: {
        whatsappEnabled: { type: Boolean, default: false },
        whatsappNumber: { type: String, default: '' },
        telegramEnabled: { type: Boolean, default: false },
        telegramUsername: { type: String, default: '' },
    },
    workflowManager: {
        connections: {
            instagram: { type: Boolean, default: false },
            googleDrive: { type: Boolean, default: false },
            captionEngine: { type: Boolean, default: false },
        },
        ioPoints: {
            driveInputFolderId: { type: String, default: '' },
            dmInputMode: { type: String, default: 'webhook' },
            instagramOutputAccountId: { type: String, default: '' },
            archiveOutputFolderId: { type: String, default: '' },
            alertOutputChannel: { type: String, default: 'in-app' },
        },
        dmRules: {
            leadKeywords: { type: String, default: 'collab, partnership, pricing, sponsor' },
            urgentKeywords: { type: String, default: 'refund, issue, problem, urgent' },
            autoAcknowledge: { type: Boolean, default: true },
            slaMinutes: { type: Number, default: 30 },
        },
        browserWorkspace: {
            homeUrl: { type: String, default: 'https://chatgpt.com' },
            allowedDomains: { type: String, default: 'chatgpt.com,claude.ai,gemini.google.com' },
            allowAnyUrl: { type: Boolean, default: true },
            sessionTracking: { type: Boolean, default: true },
            recordingEnabled: { type: Boolean, default: true },
            integrationWebhookUrl: { type: String, default: '' },
            integrationAuthToken: { type: String, default: '' },
            emitVisitEvents: { type: Boolean, default: true },
            emitRecordingEvents: { type: Boolean, default: true },
            socialMode: { type: Boolean, default: true },
        },
    },
    geminiApiKey: { type: String, default: '' },
    chatgptApiKey: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
}, { timestamps: true });

module.exports = mongoose.model('UserSettings', UserSettingsSchema);
