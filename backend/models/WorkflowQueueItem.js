const mongoose = require('mongoose');

const WorkflowQueueItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    driveFolder: { type: String, required: true, trim: true },
    caption: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'ready', 'scheduled', 'posted'], default: 'draft' },
    scheduledAt: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowQueueItem', WorkflowQueueItemSchema);
