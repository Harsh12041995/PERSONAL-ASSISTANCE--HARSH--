// backend/services/agent/tools/defineTool.js
// Helper to declare an agent tool. A tool couples three things:
//   1. a JSON Schema (`parameters`) the model sees, to decide arguments
//   2. a Zod schema (`schema`) to validate/coerce the model's arguments at runtime
//   3. an `execute(args, ctx)` that performs the side effect against real data
//
// `ctx` always carries at least { userId }. Tools are the ONLY way the agent
// touches user data, so validation + authorization live here uniformly.

/**
 * @typedef {Object} ToolContext
 * @property {string} userId
 */

/**
 * @param {Object} def
 * @param {string} def.name           snake_case, stable identifier
 * @param {string} def.description    shown to the model — be precise
 * @param {object} def.parameters     JSON Schema object for the model
 * @param {import('zod').ZodTypeAny} def.schema  runtime validation of args
 * @param {(args:any, ctx:ToolContext)=>Promise<any>} def.execute
 * @param {boolean} [def.destructive] requires confirmation before running
 */
function defineTool(def) {
    if (!def.name || !/^[a-z][a-z0-9_]*$/.test(def.name)) {
        throw new Error(`Invalid tool name: ${def.name}`);
    }
    if (typeof def.execute !== 'function') {
        throw new Error(`Tool ${def.name} missing execute()`);
    }
    return {
        name: def.name,
        description: def.description,
        parameters: def.parameters || { type: 'object', properties: {} },
        schema: def.schema,
        destructive: !!def.destructive,
        execute: def.execute,
        /** OpenAI/Ollama function-tool spec the model consumes. */
        toSpec() {
            return {
                type: 'function',
                function: {
                    name: this.name,
                    description: this.description,
                    parameters: this.parameters,
                },
            };
        },
    };
}

module.exports = { defineTool };
