// backend/services/agent/tools/createTask.js
const { z } = require('zod');
const Task = require('../../../models/Task');
const { defineTool } = require('./defineTool');

const schema = z.object({
    title: z.string().min(1).max(300),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    area: z.string().max(60).default('Personal'),
    tab: z.enum(['today', 'week', 'someday']).default('today'),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

module.exports = defineTool({
    name: 'create_task',
    description:
        'Create a new personal task for the user. Use when the user wants to remember to do something. ' +
        'Infer priority and timeframe (tab) from phrasing like "urgent", "today", "this week", "someday".',
    parameters: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Short imperative task title' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            area: { type: 'string', description: 'Life area, e.g. Work, Health, Personal, Finance, Learning' },
            tab: { type: 'string', enum: ['today', 'week', 'someday'] },
            dueDate: { type: 'string', description: 'Optional due date YYYY-MM-DD' },
        },
        required: ['title'],
    },
    schema,
    async execute(args, ctx) {
        const task = await Task.create({ userId: ctx.userId, ...args, dueDate: args.dueDate ?? null });
        return { id: task._id.toString(), title: task.title, priority: task.priority, tab: task.tab, dueDate: task.dueDate };
    },
});
