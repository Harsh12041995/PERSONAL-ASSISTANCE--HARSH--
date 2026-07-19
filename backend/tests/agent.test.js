// backend/tests/agent.test.js
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { ToolRegistry } = require('../services/agent/tools/registry');
const { defineTool } = require('../services/agent/tools/defineTool');
const { runAgentLoop } = require('../services/agent/loop');
const { z } = require('zod');

// A tool with an in-memory side effect so we can assert the agent acted.
function makeEchoTool(sink) {
    return defineTool({
        name: 'create_task',
        description: 'create a task',
        parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
        schema: z.object({ title: z.string().min(1) }),
        async execute(args, ctx) {
            sink.push({ ...args, userId: ctx.userId });
            return { id: 'task_1', title: args.title };
        },
    });
}

describe('ToolRegistry', () => {
    it('validates args and executes, returning a structured result', async () => {
        const sink = [];
        const reg = new ToolRegistry().register(makeEchoTool(sink));

        const ok = await reg.execute('create_task', { title: 'Buy milk' }, { userId: 'u1' });
        expect(ok.ok).toBe(true);
        expect(ok.data.title).toBe('Buy milk');
        expect(sink).toHaveLength(1);

        const bad = await reg.execute('create_task', { title: '' }, { userId: 'u1' });
        expect(bad.ok).toBe(false);
        expect(bad.error).toMatch(/Invalid arguments/);

        const missing = await reg.execute('nope', {}, { userId: 'u1' });
        expect(missing.ok).toBe(false);
    });

    it('refuses execution without an authenticated user', async () => {
        const reg = new ToolRegistry().register(makeEchoTool([]));
        await expect(reg.execute('create_task', { title: 'x' }, {})).rejects.toThrow();
    });
});

describe('runAgentLoop', () => {
    it('executes the tool the model requests, then returns the final answer', async () => {
        const sink = [];
        const reg = new ToolRegistry().register(makeEchoTool(sink));

        // Mock provider: first turn asks for a tool, second turn gives final text.
        const provider = {
            chat: vi.fn()
                .mockResolvedValueOnce({
                    role: 'assistant',
                    tool_calls: [{ function: { name: 'create_task', arguments: { title: 'Buy milk' } } }],
                })
                .mockResolvedValueOnce({ role: 'assistant', content: 'Done — added "Buy milk" to today.' }),
        };

        const events = [];
        const result = await runAgentLoop({
            provider, registry: reg,
            messages: [{ role: 'user', content: 'remind me to buy milk' }],
            ctx: { userId: 'u1' },
            onEvent: (e) => events.push(e.type),
        });

        expect(sink).toEqual([{ title: 'Buy milk', userId: 'u1' }]);
        expect(result.text).toMatch(/Buy milk/);
        expect(result.toolCalls[0]).toMatchObject({ name: 'create_task', ok: true });
        expect(events).toContain('tool_call');
        expect(events).toContain('tool_result');
        expect(events).toContain('done');
        expect(provider.chat).toHaveBeenCalledTimes(2);
    });

    it('returns directly when the model makes no tool calls', async () => {
        const reg = new ToolRegistry();
        const provider = { chat: vi.fn().mockResolvedValue({ role: 'assistant', content: 'Hello!' }) };
        const result = await runAgentLoop({
            provider, registry: reg,
            messages: [{ role: 'user', content: 'hi' }], ctx: { userId: 'u1' },
        });
        expect(result.text).toBe('Hello!');
        expect(result.steps).toBe(1);
        expect(result.toolCalls).toHaveLength(0);
    });
});
