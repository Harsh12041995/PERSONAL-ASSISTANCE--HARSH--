// backend/services/reminders.js
// Evening nudge: if the user hasn't logged any habit today, send a push +
// in-app notification. Idempotent per day (skips if an unread nudge exists).

const Health = require('../models/Health');
const Notification = require('../models/Notification');
const push = require('./push');

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function generateHabitReminder(userId) {
    const today = fmtDate(new Date());
    const doc = await Health.findOne({ userId, date: today });
    const habits = doc && doc.habits
        ? (doc.habits instanceof Map ? Array.from(doc.habits.values()) : Object.values(doc.habits))
        : [];
    const anyDone = habits.some(Boolean);
    if (anyDone) return { nudged: false };

    const title = 'Log today’s habits 🌙';
    const existing = await Notification.findOne({ userId, title, isRead: false });
    if (existing) return { nudged: false };

    const body = 'You haven’t checked off any habits today — a quick win before bed?';
    await Notification.create({ userId, title, message: body, type: 'info' });
    push.sendToUser(userId, { title, body, url: '/health', tag: 'habit-reminder' }).catch(() => { });
    return { nudged: true };
}

module.exports = { generateHabitReminder };
