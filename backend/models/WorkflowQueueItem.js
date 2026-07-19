const mongoose = require('mongoose');

const WorkflowQueueItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    driveFolder: { type: String, required: true, trim: true },
    caption: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'ready', 'scheduled', 'posted'], default: 'draft' },
    scheduledAt: { type: String, default: '' },
    postedAt: { type: Date, default: null },        // set when the (simulated) post runs
    publishedUrl: { type: String, default: '' },    // real post URL once a live integration exists
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowQueueItem', WorkflowQueueItemSchema);
