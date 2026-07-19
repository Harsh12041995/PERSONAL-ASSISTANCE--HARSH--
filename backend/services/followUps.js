// backend/services/followUps.js
// Turns overdue contacts (last-talked older than their followUpDays) into
// in-app Notification docs. Idempotent: skips a contact that already has an
// unread follow-up notification, so re-running the job never spams.

const Contact = require('../models/Contact');
const Notification = require('../models/Notification');
const push = require('./push');

const daysSince = (d) => {
    if (!d) return 999;
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return 999;
    return Math.floor((Date.now() - t) / 86400000);
};

async function generateFollowUpReminders(userId) {
    const contacts = await Contact.find({ userId }).lean();
    let created = 0;
    for (const c of contacts) {
        const overdueBy = daysSince(c.lastTalked) - (c.followUpDays || 14);
        if (overdueBy <= 0) continue;

        const title = `Follow up with ${c.name}`;
        const existing = await Notification.findOne({ userId, title, isRead: false });
        if (existing) continue;

        const body = `It's been ${daysSince(c.lastTalked)} days since you last talked to ${c.name}. Time to reconnect.`;
        await Notification.create({ userId, title, message: body, type: 'warning' });
        // Best-effort push (no-op when VAPID keys aren't configured).
        push.sendToUser(userId, { title, body, url: '/social', tag: `followup-${c._id}` }).catch(() => { });
        created += 1;
    }
    return { created };
}

module.exports = { generateFollowUpReminders };
