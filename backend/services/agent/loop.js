// backend/services/agent/loop.js
// The agent loop: call the model, execute any tool calls it requests, feed the
// results back, and repeat until the model produces a final answer (no more
// tool calls) or the step budget is exhausted. Emits structured events so a
// transport (SSE) can stream progress to the client.

const { logger } = require('../../config/logger');

/**
 * @typedef {Object} AgentEvent
 * @property {'text'|'tool_call'|'tool_result'|'step'|'done'|'error'} type
 */

/**
 * @param {Object} args
 * @param {import('./provider/ollama').OllamaProvider} args.provider
 * @param {import('./tools/registry').ToolRegistry} args.registry
 * @param {Array<object>} args.messages   conversation so far (incl. system)
 * @param {{userId:string}} args.ctx
 * @param {string[]} [args.allowTools]    restrict to a subset of tool names
 * @param {number} [args.maxSteps]        tool-resolution rounds (default 6)
 * @param {(e:AgentEvent)=>void} [args.onEvent]
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<{text:string, steps:number, toolCalls:Array, messages:Array}>}
 */
async function runAgentLoop({ provider, registry, messages, ctx, allowTools, maxSteps = 6, onEvent, signal }) {
    const specs = registry.specs(allowTools);
    const convo = [...messages];
    const toolCalls = [];
    let steps = 0;

    while (steps < maxSteps) {
        steps += 1;
        onEvent?.({ type: 'step', step: steps });

        const assistant = await provider.chat({ messages: convo, tools: specs, signal });
        convo.push(assistant);

        const calls = assistant.tool_calls || [];
        if (!calls.length) {
            // No tool calls => this is the final answer.
            const text = assistant.content || '';
            onEvent?.({ type: 'text', delta: text });
            onEvent?.({ type: 'done', steps, toolCalls });
            return { text, steps, toolCalls, messages: convo };
        }

        // Execute each requested tool and append results for the next round.
        for (const call of calls) {
            const name = call.function?.name;
            let args = call.function?.arguments;
            if (typeof args === 'string') {
                try { args = JSON.parse(args); } catch { args = {}; }
            }
            onEvent?.({ type: 'tool_call', name, args });

            const result = await registry.execute(name, args, ctx);
            toolCalls.push({ name, args, ok: result.ok, result: result.ok ? result.data : result.error });
            onEvent?.({ type: 'tool_result', name, ok: result.ok, data: result.ok ? result.data : undefined, error: result.error });

            convo.push({
                role: 'tool',
                tool_name: name,
                content: JSON.stringify(result.ok ? { ok: true, ...flatten(result.data) } : { ok: false, error: result.error }),
            });
        }
    }

    // Budget exhausted — ask the model for a final summary without tools.
    logger.warn({ steps }, 'Agent loop hit maxSteps; forcing final answer');
    const finalMsg = await provider.chat({
        messages: [...convo, { role: 'user', content: 'Summarize what you did and the outcome for me, concisely.' }],
        signal,
    });
    const text = finalMsg.content || '';
    onEvent?.({ type: 'text', delta: text });
    onEvent?.({ type: 'done', steps, toolCalls });
    return { text, steps, toolCalls, messages: convo };
}

function flatten(data) {
    return data && typeof data === 'object' && !Array.isArray(data) ? data : { value: data };
}

module.exports = { runAgentLoop };
