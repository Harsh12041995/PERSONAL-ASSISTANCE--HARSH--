// backend/controllers/agent.js
const { z } = require('zod');
const { runAgent, provider } = require('../services/agent');
const { defaultRegistry } = require('../services/agent/tools');
const { backfillUser } = require('../services/agent/rag/ingest');
const AgentRun = require('../models/AgentRun');
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError } = require('../utils/AppError');

const ChatBody = z.object({
    message: z.string().min(1).max(4000),
    conversationId: z.string().optional(),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).max(20).optional(),
});

/**
 * POST /api/v1/agent/chat  — streams the run as Server-Sent Events.
 * Events: step | tool_call | tool_result | text | done | error
 */
exports.chat = asyncHandler(async (req, res) => {
    const { message, conversationId, history } = ChatBody.parse(req.body);
    const userId = req.user._id.toString();

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    try {
        const result = await runAgent({
            userId, message, history, conversationId,
            onEvent: send, signal: ac.signal,
        });
        send({ type: 'final', runId: result.runId, text: result.text, latencyMs: result.latencyMs });
    } catch (err) {
        send({ type: 'error', error: err.message });
    } finally {
        res.end();
    }
});

/** GET /api/v1/agent/runs/:id — full trace of a run (owner-scoped). */
exports.getRun = asyncHandler(async (req, res) => {
    const run = await AgentRun.findOne({ _id: req.params.id, userId: req.user._id });
    if (!run) throw AppError.notFound('Run not found');
    res.json({ success: true, data: run });
});

/** GET /api/v1/agent/runs — recent runs for the user. */
exports.listRuns = asyncHandler(async (req, res) => {
    const runs = await AgentRun.find({ userId: req.user._id })
        .sort({ createdAt: -1 }).limit(25).select('input output status steps latencyMs createdAt');
    res.json({ success: true, data: runs });
});

/** GET /api/v1/agent/tools — the registered tool catalog (for the UI). */
exports.listTools = asyncHandler(async (_req, res) => {
    const tools = defaultRegistry.list().map((t) => ({
        name: t.name, description: t.description, parameters: t.parameters, destructive: t.destructive,
    }));
    res.json({ success: true, data: tools });
});

/** GET /api/v1/agent/health — is the local engine reachable? */
exports.health = asyncHandler(async (_req, res) => {
    const up = await provider.ping();
    res.json({ success: true, data: { engine: 'ollama', model: provider.model, reachable: up } });
});

/**
 * POST /api/v1/agent/reindex — (re)build the RAG vector index for the user's
 * captures, knowledge, goals, and journal. Safe to run repeatedly (upserts).
 */
exports.reindex = asyncHandler(async (req, res) => {
    const summary = await backfillUser(req.user._id);
    res.json({ success: true, data: { reindexed: summary } });
});
