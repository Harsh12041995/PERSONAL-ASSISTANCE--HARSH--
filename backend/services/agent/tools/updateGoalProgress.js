// backend/services/agent/tools/updateGoalProgress.js
const { z } = require('zod');
const Goal = require('../../../models/Goal');
const { defineTool } = require('./defineTool');

const schema = z.object({
    title: z.string().min(1).max(200),
    progress: z.number().int().min(0).max(100),
});

module.exports = defineTool({
    name: 'update_goal_progress',
    description: 'Set the progress percentage (0-100) of an existing goal, matched by partial title.',
    parameters: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Part of the goal title to match' },
            progress: { type: 'number', description: 'New progress percent 0-100' },
        },
        required: ['title', 'progress'],
    },
    schema,
    async execute(args, ctx) {
        const safe = args.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const goal = await Goal.findOne({ userId: ctx.userId, title: new RegExp(safe, 'i') }).sort({ createdAt: -1 });
        if (!goal) return { ok: false, message: `No goal matching "${args.title}"` };
        goal.progress = args.progress;
        await goal.save();
        return { ok: true, id: goal._id.toString(), title: goal.title, progress: goal.progress };
    },
});
