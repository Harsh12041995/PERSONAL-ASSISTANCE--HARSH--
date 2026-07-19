// backend/services/agent/tools/addCalendarEvent.js
const { z } = require('zod');
const CalendarEvent = require('../../../models/CalendarEvent');
const { defineTool } = require('./defineTool');

const schema = z.object({
    title: z.string().min(1).max(200),
    start: z.string().min(8),   // YYYY-MM-DD or ISO datetime
    end: z.string().min(8).optional(),
    calendar: z.enum(['Primary', 'Work', 'Personal', 'Health', 'Learning', 'Danger', 'Success', 'Warning']).default('Primary'),
    allDay: z.boolean().default(true),
});

module.exports = defineTool({
    name: 'add_calendar_event',
    description:
        'Add an event to the calendar. `start`/`end` are YYYY-MM-DD for all-day events, or full ISO datetimes for timed events. ' +
        'Use for meetings, appointments, reminders tied to a date.',
    parameters: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Event title' },
            start: { type: 'string', description: 'YYYY-MM-DD or ISO datetime' },
            end: { type: 'string', description: 'Optional end, same format as start' },
            calendar: { type: 'string', enum: ['Primary', 'Work', 'Personal', 'Health', 'Learning'] },
            allDay: { type: 'boolean', description: 'true for all-day; false for a timed event' },
        },
        required: ['title', 'start'],
    },
    schema,
    async execute(args, ctx) {
        const ev = await CalendarEvent.create({
            userId: ctx.userId, title: args.title, start: args.start,
            end: args.end || args.start, calendar: args.calendar, allDay: args.allDay,
        });
        return { id: ev._id.toString(), title: ev.title, start: ev.start, end: ev.end, calendar: ev.calendar };
    },
});
