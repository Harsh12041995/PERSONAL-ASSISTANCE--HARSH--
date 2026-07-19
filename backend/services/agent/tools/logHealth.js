// backend/services/agent/tools/logHealth.js
const { z } = require('zod');
const Health = require('../../../models/Health');
const { defineTool } = require('./defineTool');

const today = () => new Date().toISOString().slice(0, 10);

const schema = z.object({
    mood: z.string().max(40).optional(),
    energy: z.number().int().min(0).max(5).optional(),
    habitsDone: z.array(z.string().max(80)).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

module.exports = defineTool({
    name: 'log_health',
    description:
        "Log today's wellness: mood, energy (0-5), and/or habits completed. " +
        'Use for "I slept well", "mark meditation done", "energy is a 4", etc. Merges into today\'s record.',
    parameters: {
        type: 'object',
        properties: {
            mood: { type: 'string', description: 'Mood label or emoji, e.g. Good, 😊' },
            energy: { type: 'number', description: 'Energy level 0-5' },
            habitsDone: { type: 'array', items: { type: 'string' }, description: 'Habit names to mark done, e.g. ["Read 30 mins"]' },
            date: { type: 'string', description: 'Optional YYYY-MM-DD, defaults to today' },
        },
    },
    schema,
    async execute(args, ctx) {
        const date = args.date || today();
        const doc = await Health.findOne({ userId: ctx.userId, date }) || new Health({ userId: ctx.userId, date });
        if (args.mood !== undefined) doc.mood = args.mood;
        if (args.energy !== undefined) doc.energy = args.energy;
        if (args.habitsDone?.length) {
            for (const h of args.habitsDone) doc.habits.set(h, true);
        }
        await doc.save();
        return {
            ok: true, date,
            mood: doc.mood, energy: doc.energy,
            habitsDone: Array.from(doc.habits.entries()).filter(([, v]) => v).map(([k]) => k),
        };
    },
});
