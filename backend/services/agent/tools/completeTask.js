// backend/services/agent/tools/completeTask.js
const { z } = require('zod');
const Task = require('../../../models/Task');
const { defineTool } = require('./defineTool');

const schema = z.object({
    title: z.string().min(1).max(300),
});

module.exports = defineTool({
    name: 'complete_task',
    description:
        'Mark an existing task as done. Match by (partial, case-insensitive) title. ' +
        'Use when the user says they finished/completed something.',
    parameters: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Part of the task title to match, e.g. "buy milk"' },
        },
        required: ['title'],
    },
    schema,
    async execute(args, ctx) {
        // Prefer an open task; escape regex specials from the model's input.
        const safe = args.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(safe, 'i');
        const task = await Task.findOne({ userId: ctx.userId, title: rx, done: false })
            .sort({ createdAt: -1 })
            || await Task.findOne({ userId: ctx.userId, title: rx }).sort({ createdAt: -1 });
        if (!task) return { ok: false, message: `No task matching "${args.title}"` };
        task.done = true;
        await task.save();
        return { ok: true, id: task._id.toString(), title: task.title, done: true };
    },
});
