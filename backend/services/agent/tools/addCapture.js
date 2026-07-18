// backend/services/agent/tools/addCapture.js
const { z } = require('zod');
const Capture = require('../../../models/Capture');
const { defineTool } = require('./defineTool');

const TYPES = ['Idea', 'Task', 'Article', 'Follow-up', 'Money', 'Urgent', 'Journal'];
const EMOJI = { Idea: '💡', Task: '✅', Article: '📰', 'Follow-up': '📞', Money: '💰', Urgent: '🔴', Journal: '📓' };

const schema = z.object({
    text: z.string().min(1).max(2000),
    type: z.enum(TYPES).default('Idea'),
});

module.exports = defineTool({
    name: 'add_capture',
    description:
        'Save a quick capture to the user\'s inbox — any thought, idea, note, link, or reminder ' +
        'that does not clearly belong elsewhere. Pick the closest type from the enum.',
    parameters: {
        type: 'object',
        properties: {
            text: { type: 'string', description: 'The captured content' },
            type: { type: 'string', enum: TYPES },
        },
        required: ['text'],
    },
    schema,
    async execute(args, ctx) {
        const cap = await Capture.create({
            userId: ctx.userId,
            text: args.text,
            type: args.type,
            emoji: EMOJI[args.type] || '💡',
        });
        return { id: cap._id.toString(), type: cap.type, text: cap.text };
    },
});
