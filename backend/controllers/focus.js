// backend/controllers/focus.js — Pomodoro focus sessions + derived gamification.
const FocusSession = require('../models/FocusSession');
const Task = require('../models/Task');
const Health = require('../models/Health');
const Goal = require('../models/Goal');
const Finance = require('../models/Finance');
const Capture = require('../models/Capture');

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, e) => res.status(500).json({ success: false, error: e.message });

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => fmtDate(new Date());

// ── Focus sessions ──────────────────────────────────────────────────────────────
exports.createFocusSession = async (req, res) => {
    try {
        const { label, minutes, taskId } = req.body;
        const m = Number(minutes);
        if (!m || m < 1) return res.status(400).json({ success: false, error: 'minutes required' });
        const doc = await FocusSession.create({
            userId: req.user._id,
            label: (label || 'Focus').slice(0, 200),
            taskId: taskId || null,
            minutes: Math.min(600, Math.round(m)),
            date: todayStr(),
        });
        ok(res, doc);
    } catch (e) { fail(res, e); }
};

exports.getFocusSessions = async (req, res) => {
    try {
        const sessions = await FocusSession.find({ userId: req.user._id }).sort({ completedAt: -1 }).limit(100);
        const today = todayStr();
        const todayMinutes = sessions.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0);
        const totalMinutes = await FocusSession.aggregate([
            { $match: { userId: req.user._id } },
            { $group: { _id: null, m: { $sum: '$minutes' } } },
        ]);
        ok(res, { sessions, todayMinutes, totalMinutes: totalMinutes[0]?.m || 0 });
    } catch (e) { fail(res, e); }
};

exports.deleteFocusSession = async (req, res) => {
    try {
        await FocusSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        ok(res, { deleted: req.params.id });
    } catch (e) { fail(res, e); }
};

// ── Gamification (all derived from real activity) ────────────────────────────────

// Consecutive-day streak ending today/yesterday from a set of active YYYY-MM-DD dates.
function streakFrom(datesSet) {
    let streak = 0;
    const d = new Date();
    // Allow the streak to "hold" if today isn't logged yet but yesterday was.
    if (!datesSet.has(fmtDate(d))) d.setDate(d.getDate() - 1);
    while (datesSet.has(fmtDate(d))) { streak += 1; d.setDate(d.getDate() - 1); }
    return streak;
}

const ACHIEVEMENTS = [
    { id: 'first_focus', emoji: '🍅', name: 'First Focus', desc: 'Complete a focus session', test: s => s.focusSessions >= 1 },
    { id: 'focus_5h', emoji: '⏳', name: 'Deep Diver', desc: '5 hours focused', test: s => s.focusMinutes >= 300 },
    { id: 'focus_marathon', emoji: '🏊', name: 'Marathoner', desc: '25 hours focused', test: s => s.focusMinutes >= 1500 },
    { id: 'task_10', emoji: '✅', name: 'Getting Things Done', desc: 'Complete 10 tasks', test: s => s.tasksCompleted >= 10 },
    { id: 'task_100', emoji: '💯', name: 'Centurion', desc: 'Complete 100 tasks', test: s => s.tasksCompleted >= 100 },
    { id: 'streak_7', emoji: '🔥', name: 'Week Warrior', desc: '7-day habit streak', test: s => s.habitStreak >= 7 },
    { id: 'streak_30', emoji: '🌟', name: 'Unstoppable', desc: '30-day habit streak', test: s => s.habitStreak >= 30 },
    { id: 'goal_getter', emoji: '🎯', name: 'Goal Getter', desc: 'Complete a goal', test: s => s.goalsCompleted >= 1 },
    { id: 'money_minder', emoji: '💰', name: 'Money Minder', desc: 'Log 20 transactions', test: s => s.transactions >= 20 },
    { id: 'scribe', emoji: '🖋️', name: 'Scribe', desc: 'Capture 25 thoughts', test: s => s.captures >= 25 },
];

// Level curve: level N needs 100*(N-1)^2 XP.
const levelForXp = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;
const xpForLevel = (n) => 100 * (n - 1) * (n - 1);

exports.getGamification = async (req, res) => {
    try {
        const uid = req.user._id;
        const [tasksCompleted, goalsCompleted, transactions, captures, healthDocs, focusAgg] = await Promise.all([
            Task.countDocuments({ userId: uid, done: true }),
            Goal.countDocuments({ userId: uid, progress: { $gte: 100 } }),
            Finance.countDocuments({ userId: uid }),
            Capture.countDocuments({ userId: uid }),
            Health.find({ userId: uid }, 'date habits').sort({ date: -1 }).limit(180).lean(),
            FocusSession.aggregate([
                { $match: { userId: uid } },
                { $group: { _id: null, minutes: { $sum: '$minutes' }, count: { $sum: 1 } } },
            ]),
        ]);

        // Habit checks + streak from Health docs.
        let habitChecks = 0;
        const activeHabitDays = new Set();
        for (const h of healthDocs) {
            const vals = h.habits ? Object.values(h.habits) : [];
            const done = vals.filter(Boolean).length;
            habitChecks += done;
            if (done > 0) activeHabitDays.add(h.date);
        }
        const habitStreak = streakFrom(activeHabitDays);

        // Focus streak from session dates.
        const focusDates = new Set((await FocusSession.find({ userId: uid }, 'date').lean()).map(f => f.date));
        const focusStreak = streakFrom(focusDates);

        const focusMinutes = focusAgg[0]?.minutes || 0;
        const focusSessions = focusAgg[0]?.count || 0;

        const stats = { tasksCompleted, goalsCompleted, transactions, captures, habitChecks, habitStreak, focusMinutes, focusSessions, focusStreak };

        const xp = tasksCompleted * 10 + habitChecks * 5 + goalsCompleted * 50 + focusMinutes * 1 + captures * 2 + transactions * 3;
        const level = levelForXp(xp);
        const thisLevelXp = xpForLevel(level);
        const nextLevelXp = xpForLevel(level + 1);

        const achievements = ACHIEVEMENTS.map(a => ({
            id: a.id, emoji: a.emoji, name: a.name, desc: a.desc, unlocked: a.test(stats),
        }));

        ok(res, {
            xp, level,
            levelProgress: nextLevelXp > thisLevelXp ? (xp - thisLevelXp) / (nextLevelXp - thisLevelXp) : 1,
            xpIntoLevel: xp - thisLevelXp,
            xpForNext: nextLevelXp - thisLevelXp,
            habitStreak, focusStreak,
            stats,
            achievements,
        });
    } catch (e) { fail(res, e); }
};
