// backend/services/agent/tools/searchContext.js
const { z } = require('zod');
const { defineTool } = require('./defineTool');
const { embed } = require('../rag/embeddings');
const { VectorStore } = require('../rag/vectorStore');

const MODULES = ['capture', 'knowledge', 'goal', 'journal'];

const schema = z.object({
    query: z.string().min(1).max(500),
    modules: z.array(z.enum(MODULES)).optional(),
    k: z.number().int().min(1).max(12).default(6),
});

module.exports = defineTool({
    name: 'search_personal_context',
    description:
        'Search the user\'s own notes, captures, goals, and journal for information relevant to a question. ' +
        'Use this BEFORE answering anything about the user\'s life, plans, ideas, or history, so your answer is ' +
        'grounded in their real records. Returns cited snippets — refer to them in your reply.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'What to look for, in natural language' },
            modules: { type: 'array', items: { type: 'string', enum: MODULES }, description: 'Optional: restrict to these areas' },
            k: { type: 'number', description: 'How many snippets to return (default 6)' },
        },
        required: ['query'],
    },
    schema,
    async execute(args, ctx) {
        const vector = await embed(args.query);
        if (!vector.length) return { results: [], note: 'No query embedding produced.' };

        const hits = await VectorStore.search({
            userId: ctx.userId,
            vector,
            k: args.k,
            modules: args.modules,
        });

        return {
            results: hits.map((h) => ({
                source: `${h.module}:${h.sourceId}`,
                module: h.module,
                snippet: h.text.slice(0, 400),
                score: Number(h.score?.toFixed(3) ?? 0),
            })),
        };
    },
});
