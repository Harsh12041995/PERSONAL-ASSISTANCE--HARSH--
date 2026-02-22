const mongoose = require('mongoose');

const KnowledgeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Note', 'Book', 'Article', 'Learning'], default: 'Note' },
    content: { type: String, default: '' },
    tags: [{ type: String }],
    emoji: { type: String, default: '📝' },
}, { timestamps: true });

module.exports = mongoose.model('Knowledge', KnowledgeSchema);
