const mongoose = require('mongoose');

const SocialPlatformSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, required: true },  // Instagram, LinkedIn, Twitter, etc.
    handle: { type: String, default: '' },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    engagement: { type: String, default: '0%' },
    lastPost: { type: String, default: '' },      // YYYY-MM-DD
    profileUrl: { type: String, default: '' },
    emoji: { type: String, default: '📱' },
    // Historical snapshots for trend tracking
    snapshots: [{
        date: { type: String },
        followers: { type: Number },
        engagement: { type: String },
    }],
}, { timestamps: true });

SocialPlatformSchema.index({ userId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('SocialPlatform', SocialPlatformSchema);
