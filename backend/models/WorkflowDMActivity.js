const mongoose = require('mongoose');

const WorkflowDMActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    category: { type: String, enum: ['lead', 'support', 'spam', 'general'], default: 'general' },
    status: { type: String, enum: ['new', 'acknowledged', 'escalated', 'resolved'], default: 'new' },
    receivedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowDMActivity', WorkflowDMActivitySchema);
