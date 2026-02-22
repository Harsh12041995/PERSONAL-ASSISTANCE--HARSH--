const mongoose = require('mongoose');

const ContentIdeaSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    platform: { type: String, enum: ['Instagram', 'LinkedIn', 'Twitter', 'YouTube', 'Blog', 'Other'], default: 'Instagram' },
    status: { type: String, enum: ['Idea', 'Draft', 'Scheduled', 'Published'], default: 'Idea' },
    notes: { type: String, default: '' },
    tags: [{ type: String }],
    dueDate: { type: String, default: '' },
    publishedAt: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ContentIdea', ContentIdeaSchema);
