// backend/services/agent/tools/addContact.js
const { z } = require('zod');
const Contact = require('../../../models/Contact');
const { defineTool } = require('./defineTool');

const schema = z.object({
    name: z.string().min(1).max(120),
    relationship: z.enum(['Friend', 'Family', 'Colleague', 'Professional', 'Mentor', 'Other']).default('Friend'),
    phone: z.string().max(40).optional(),
    followUpDays: z.number().int().min(1).max(365).optional(),
});

module.exports = defineTool({
    name: 'add_contact',
    description: 'Add a person to the social/contacts list, optionally with a phone and a follow-up cadence (days).',
    parameters: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Contact name' },
            relationship: { type: 'string', enum: ['Friend', 'Family', 'Colleague', 'Professional', 'Mentor', 'Other'] },
            phone: { type: 'string', description: 'Optional phone number' },
            followUpDays: { type: 'number', description: 'Optional follow-up cadence in days' },
        },
        required: ['name'],
    },
    schema,
    async execute(args, ctx) {
        const c = await Contact.create({
            userId: ctx.userId, name: args.name, relationship: args.relationship,
            phone: args.phone || '', followUpDays: args.followUpDays ?? 14,
        });
        return { id: c._id.toString(), name: c.name, relationship: c.relationship };
    },
});
