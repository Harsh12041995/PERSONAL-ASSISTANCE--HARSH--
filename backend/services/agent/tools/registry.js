// backend/services/agent/tools/registry.js
// In-memory registry of agent tools. Provides the model-facing spec list and a
// single validated execution path with structured success/error results.

const { AppError } = require('../../../utils/AppError');
const { logger } = require('../../../config/logger');

class ToolRegistry {
    constructor() {
        /** @type {Map<string, ReturnType<import('./defineTool').defineTool>>} */
        this.tools = new Map();
    }

    register(tool) {
        if (this.tools.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`);
        this.tools.set(tool.name, tool);
        return this;
    }

    has(name) { return this.tools.has(name); }
    get(name) { return this.tools.get(name); }
    list() { return [...this.tools.values()]; }

    /** Tool specs for the model, optionally filtered to an allow-list of names. */
    specs(allow) {
        const list = allow ? this.list().filter((t) => allow.includes(t.name)) : this.list();
        return list.map((t) => t.toSpec());
    }

    /**
     * Validate args with the tool's Zod schema, then execute.
     * Never throws for tool-level failures — returns a structured result the
     * agent loop can feed back to the model so it can recover.
     * @returns {Promise<{ok:boolean, data?:any, error?:string}>}
     */
    async execute(name, rawArgs, ctx) {
        const tool = this.tools.get(name);
        if (!tool) return { ok: false, error: `Unknown tool: ${name}` };
        if (!ctx?.userId) throw new AppError('Tool execution requires an authenticated user', 401);

        let args = rawArgs ?? {};
        if (tool.schema) {
            const parsed = tool.schema.safeParse(args);
            if (!parsed.success) {
                return {
                    ok: false,
                    error: 'Invalid arguments: ' + parsed.error.issues.map((i) => `${i.path.join('.')||'arg'}: ${i.message}`).join('; '),
                };
            }
            args = parsed.data;
        }

        try {
            const data = await tool.execute(args, ctx);
            return { ok: true, data };
        } catch (err) {
            logger.warn({ tool: name, err: err.message }, 'Tool execution error');
            return { ok: false, error: err.message || 'Tool failed' };
        }
    }
}

module.exports = { ToolRegistry };
