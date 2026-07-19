const mongoose = require('mongoose');

// A post ingested from the user's own blog feed. Raw material for the
// ghostwriter flywheel and for RAG grounding.
const BlogPostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    guid: { type: String, required: true },          // feed item guid/link — dedupe key
    title: { type: String, required: true, trim: true },
    link: { type: String, default: '' },
    content: { type: String, default: '' },          // text-only excerpt/body
    publishedAt: { type: Date, default: null },
    // Set once the ghostwriter has produced platform drafts for this post.
    ghostwrittenAt: { type: Date, default: null },
}, { timestamps: true });

BlogPostSchema.index({ userId: 1, guid: 1 }, { unique: true });

module.exports = mongoose.model('BlogPost', BlogPostSchema);
