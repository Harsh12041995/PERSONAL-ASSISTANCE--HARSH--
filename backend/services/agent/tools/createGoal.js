// backend/services/agent/tools/createGoal.js
const { z } = require('zod');
const Goal = require('../../../models/Goal');
const { defineTool } = require('./defineTool');

const schema = z.object({
    title: z.string().min(1).max(200),
    area: z.string().max(60).default('Personal'),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

module.exports = defineTool({
    name: 'create_goal',
    description: 'Create a new personal goal. Use for longer-term objectives the user wants to track progress toward.',
    parameters: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'The goal, e.g. "Run a half marathon"' },
            area: { type: 'string', description: 'Life area, e.g. Health, Career, Finance, Learning' },
            deadline: { type: 'string', description: 'Optional target date YYYY-MM-DD' },
        },
        required: ['title'],
    },
    schema,
    async execute(args, ctx) {
        const goal = await Goal.create({
            userId: ctx.userId, title: args.title, area: args.area,
            deadline: args.deadline ?? null, progress: 0, milestones: [],
        });
        return { id: goal._id.toString(), title: goal.title, area: goal.area, deadline: goal.deadline };
    },
});
