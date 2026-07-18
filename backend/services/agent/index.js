// backend/services/agent/index.js
// High-level orchestration: assemble the system prompt + conversation, run the
// agent loop, and persist a trace (AgentRun). This is what controllers call.

const { provider } = require('./provider/instance');
const { defaultRegistry } = require('./tools');
const { runAgentLoop } = require('./loop');
const AgentRun = require('../../models/AgentRun');
const { logger } = require('../../config/logger');

const SYSTEM_PROMPT = [
    'You are the user\'s private personal assistant inside their Personal Command Center.',
    'You can take real actions on their data using the provided tools — prefer acting over just describing.',
    'When the user asks you to remember, track, log, or schedule something, call the appropriate tool.',
    'Use one tool call per distinct action. After tools succeed, confirm concisely what you did.',
    'Never invent IDs or data. If a request is ambiguous, make a sensible default rather than refusing.',
    'Today\'s date is provided by the system. Keep replies short and friendly.',
].join(' ');

/**
 * Run one agent turn.
 * @param {Object} args
 * @param {string} args.userId
 * @param {string} args.message       user input
 * @param {Array<{role:string,content:string}>} [args.history] prior turns
 * @param {string} [args.conversationId]
 * @param {string[]} [args.allowTools]
 * @param {(e:object)=>void} [args.onEvent] stream sink
 * @param {AbortSignal} [args.signal]
 */
async function runAgent({ userId, message, history = [], conversationId, allowTools, onEvent, signal }) {
    const started = Date.now();
    const dateLine = `Current date: ${new Date().toISOString().slice(0, 10)}.`;

    const messages = [
        { role: 'system', content: `${SYSTEM_PROMPT} ${dateLine}` },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
    ];

    const run = await AgentRun.create({
        userId, conversationId, model: provider.model, input: message, status: 'running',
    });

    try {
        const result = await runAgentLoop({
            provider, registry: defaultRegistry, messages, ctx: { userId },
            allowTools, onEvent, signal,
        });

        run.output = result.text;
        run.toolCalls = result.toolCalls;
        run.steps = result.steps;
        run.status = 'completed';
        run.latencyMs = Date.now() - started;
        await run.save();

        return { runId: run._id.toString(), ...result, latencyMs: run.latencyMs };
    } catch (err) {
        logger.error({ err: err.message, runId: run._id.toString() }, 'Agent run failed');
        run.status = 'error';
        run.error = err.message;
        run.latencyMs = Date.now() - started;
        await run.save().catch(() => {});
        onEvent?.({ type: 'error', error: err.message });
        throw err;
    }
}

module.exports = { runAgent, provider, SYSTEM_PROMPT };
