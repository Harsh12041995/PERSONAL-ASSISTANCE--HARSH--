// backend/controllers/rituals.js — morning plan + evening reflection + weekly review.
const DailyRitual = require('../models/DailyRitual');
const Task = require('../models/Task');
const CalendarEvent = require('../models/CalendarEvent');

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, e) => res.status(500).json({ success: false, error: e.message });

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sanitizeRitual = (body = {}) => {
    const out = {};
    if (body.morning) {
        out.morning = {
            intention: String(body.morning.intention || '').slice(0, 300),
            priorities: Array.isArray(body.morning.priorities)
                ? body.morning.priorities.map((p) => String(p).slice(0, 200)).filter(Boolean).slice(0, 5) : [],
            done: !!body.morning.done,
        };
    }
    if (body.evening) {
        out.evening = {
            wins: Array.isArray(body.evening.wins)
                ? body.evening.wins.map((w) => String(w).slice(0, 300)).filter(Boolean).slice(0, 10) : [],
            gratitude: String(body.evening.gratitude || '').slice(0, 500),
            tomorrow: String(body.evening.tomorrow || '').slice(0, 300),
            rating: Math.max(0, Math.min(5, Number(body.evening.rating) || 0)),
            done: !!body.evening.done,
        };
    }
    return out;
};

// GET /rituals/:date — ritual for the day + morning context (today's tasks/events).
exports.getRitual = async (req, res) => {
    try {
        const { date } = req.params;
        const [ritual, tasks, events] = await Promise.all([
            DailyRitual.findOne({ userId: req.user._id, date }),
            Task.find({ userId: req.user._id, done: false, $or: [{ tab: 'today' }, { dueDate: date }] }).limit(20),
            CalendarEvent.find({ userId: req.user._id, start: new RegExp(`^${date}`) }).limit(20),
        ]);
        ok(res, { ritual: ritual || null, context: { tasks, events } });
    } catch (e) { fail(res, e); }
};

// PUT /rituals/:date — upsert morning and/or evening.
exports.saveRitual = async (req, res) => {
    try {
        const { date } = req.params;
        const update = sanitizeRitual(req.body);
        const doc = await DailyRitual.findOneAndUpdate(
            { userId: req.user._id, date },
            { $set: { ...update, userId: req.user._id, date } },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );
        ok(res, doc);
    } catch (e) { fail(res, e); }
};

// GET /rituals?from=&to= — range (for the weekly review).
exports.getRituals = async (req, res) => {
    try {
        const { from, to } = req.query;
        const q = { userId: req.user._id };
        if (from || to) { q.date = {}; if (from) q.date.$gte = String(from); if (to) q.date.$lte = String(to); }
        const rituals = await DailyRitual.find(q).sort({ date: 1 }).limit(60);
        ok(res, rituals);
    } catch (e) { fail(res, e); }
};

// GET /rituals/weekly — aggregate the last 7 days.
exports.getWeeklyReview = async (req, res) => {
    try {
        const to = new Date();
        const from = new Date(); from.setDate(from.getDate() - 6);
        const rituals = await DailyRitual.find({
            userId: req.user._id, date: { $gte: fmtDate(from), $lte: fmtDate(to) },
        }).sort({ date: 1 });

        const morningsPlanned = rituals.filter(r => r.morning?.done || (r.morning?.priorities?.length)).length;
        const eveningsReflected = rituals.filter(r => r.evening?.done || r.evening?.wins?.length).length;
        const ratings = rituals.map(r => r.evening?.rating).filter(n => n > 0);
        const avgRating = ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
        const wins = rituals.flatMap(r => (r.evening?.wins || []).map(w => ({ date: r.date, win: w })));

        ok(res, {
            from: fmtDate(from), to: fmtDate(to),
            daysLogged: rituals.length, morningsPlanned, eveningsReflected, avgRating,
            wins, rituals,
        });
    } catch (e) { fail(res, e); }
};
