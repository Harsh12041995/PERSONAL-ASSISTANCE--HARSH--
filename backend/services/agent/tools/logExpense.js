// backend/services/agent/tools/logExpense.js
const { z } = require('zod');
const Finance = require('../../../models/Finance');
const { defineTool } = require('./defineTool');

const today = () => new Date().toISOString().slice(0, 10);

const schema = z.object({
    type: z.enum(['income', 'expense']).default('expense'),
    amount: z.number().positive(),
    category: z.string().max(60).default('General'),
    note: z.string().max(280).default(''),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

module.exports = defineTool({
    name: 'log_expense',
    description:
        'Record a financial transaction (income or expense) for the user. ' +
        'Use when the user mentions spending, paying for, earning, or receiving money. ' +
        'Default type is expense. Amount is a positive number in the user\'s currency.',
    parameters: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['income', 'expense'] },
            amount: { type: 'number', description: 'Positive amount' },
            category: { type: 'string', description: 'e.g. Food, Transport, Shopping, Health, Salary' },
            note: { type: 'string', description: 'Short description' },
            date: { type: 'string', description: 'YYYY-MM-DD; defaults to today' },
        },
        required: ['amount'],
    },
    schema,
    async execute(args, ctx) {
        const tx = await Finance.create({
            userId: ctx.userId,
            type: args.type,
            amount: args.amount,
            category: args.category,
            note: args.note,
            date: args.date || today(),
            emoji: args.type === 'income' ? '💵' : '💰',
        });
        return { id: tx._id.toString(), type: tx.type, amount: tx.amount, category: tx.category, date: tx.date };
    },
});
