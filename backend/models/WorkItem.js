const mongoose = require('mongoose');

// The approval queue: everything an agent produces lands here for the human
// to approve, edit, or reject. The human's job is editor-in-chief, not producer.
const WorkItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['draft', 'decision', 'alert'], required: true },
    // Which staff agent produced it.
    agentRole: { type: String, enum: ['ghostwriter', 'analyst', 'chief_of_staff', 'system'], default: 'system' },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },          // markdown body (draft text, memo, recommendation)
    meta: {
        platform: { type: String, default: '' },     // linkedin | x | instagram | blog (for drafts)
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
        sourceId: { type: String, default: '' },     // e.g. BlogPost id that seeded a draft
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    editedContent: { type: String, default: '' },    // human-modified version, wins over content once set
    reviewedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('WorkItem', WorkItemSchema);
