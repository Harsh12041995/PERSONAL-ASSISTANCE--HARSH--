// backend/controllers/agent.js
const { z } = require('zod');
const { runAgent, provider } = require('../services/agent');
const { defaultRegistry } = require('../services/agent/tools');
const { backfillUser } = require('../services/agent/rag/ingest');
const AgentRun = require('../models/AgentRun');
const UserSettings = require('../models/UserSettings');
const aiService = require('../utils/aiService');
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
        // The tool-calling loop needs the local engine (Ollama). If it's down
        // but the user has a cloud key, fall back to plain chat via the
        // Gemini→ChatGPT→Ollama cascade so the Assistant always answers
        // (it just can't take actions in that mode).
        const engineUp = await provider.ping().catch(() => false);
        if (!engineUp) {
            const settings = await UserSettings.findOne({ userId: req.user._id });
            const config = { geminiKey: settings?.geminiApiKey, chatgptKey: settings?.chatgptApiKey };
            if (!config.geminiKey && !config.chatgptKey) {
                send({ type: 'error', error: 'Local engine (Ollama) is offline and no cloud AI key is set in Settings. Start Ollama or add a Gemini/ChatGPT key to chat.' });
                return;
            }
            const t0 = Date.now();
            const convo = (history || []).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
            const prompt = `${convo ? convo + '\n' : ''}User: ${message}\nAssistant:`;
            const answer = await aiService.generateText(
                prompt,
                'You are a helpful personal assistant. The action-taking tools are offline right now, so answer conversationally and, if the user asks you to DO something, tell them to retry once the local engine is running.',
                config,
            );
            send({ type: 'text', delta: answer });
            send({ type: 'final', runId: `chat_${Date.now()}`, text: answer, latencyMs: Date.now() - t0 });
            return;
        }

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
