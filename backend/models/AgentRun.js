const mongoose = require('mongoose');

// One agent invocation: the input, the tool calls made, the final output, and
// basic telemetry. This is the trace surfaced in the run/debug viewer.
const ToolCallSub = new mongoose.Schema({
    name: String,
    args: mongoose.Schema.Types.Mixed,
    ok: Boolean,
    result: mongoose.Schema.Types.Mixed,
}, { _id: false });

const AgentRunSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: String, index: true },
    agent: { type: String, default: 'supervisor' },
    model: { type: String },
    input: { type: String, required: true },
    output: { type: String, default: '' },
    toolCalls: { type: [ToolCallSub], default: [] },
    steps: { type: Number, default: 0 },
    status: { type: String, enum: ['running', 'completed', 'error'], default: 'running' },
    error: { type: String },
    latencyMs: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('AgentRun', AgentRunSchema);
