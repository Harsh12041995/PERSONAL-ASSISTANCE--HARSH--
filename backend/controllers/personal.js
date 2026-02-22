// backend/controllers/personal.js
// Handles all personal module CRUD for Harsh's assistant

const Capture = require('../models/Capture');
const Task = require('../models/Task');
const Finance = require('../models/Finance');
const Knowledge = require('../models/Knowledge');
const Goal = require('../models/Goal');
const Health = require('../models/Health');

// ─── Helper ───────────────────────────────────────────────────────────────────
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, err, status = 500) => res.status(status).json({ success: false, error: err.message || err });

// ═══════════════════════════════════════════════════════════════════════════════
//  CAPTURES
// ═══════════════════════════════════════════════════════════════════════════════
exports.getCaptures = async (req, res) => {
    try {
        const captures = await Capture.find({ userId: req.user._id }).sort({ createdAt: -1 });
        ok(res, captures);
    } catch (e) { fail(res, e); }
};

exports.createCapture = async (req, res) => {
    try {
        const { type, text, emoji } = req.body;
        const capture = await Capture.create({ userId: req.user._id, type, text, emoji });
        ok(res, capture);
    } catch (e) { fail(res, e); }
};

exports.deleteCapture = async (req, res) => {
    try {
        await Capture.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        ok(res, { deleted: req.params.id });
    } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TASKS
// ═══════════════════════════════════════════════════════════════════════════════
exports.getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
        ok(res, tasks);
    } catch (e) { fail(res, e); }
};

exports.createTask = async (req, res) => {
    try {
        const { title, priority, area, tab, dueDate } = req.body;
        const task = await Task.create({ userId: req.user._id, title, priority, area, tab, dueDate });
        ok(res, task);
    } catch (e) { fail(res, e); }
};

exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true }
        );
        ok(res, task);
    } catch (e) { fail(res, e); }
};

exports.deleteTask = async (req, res) => {
    try {
        await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        ok(res, { deleted: req.params.id });
    } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FINANCE
// ═══════════════════════════════════════════════════════════════════════════════
exports.getTransactions = async (req, res) => {
    try {
        const txns = await Finance.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });
        ok(res, txns);
    } catch (e) { fail(res, e); }
};

exports.createTransaction = async (req, res) => {
    try {
        const { type, amount, category, note, date, emoji } = req.body;
        const txn = await Finance.create({ userId: req.user._id, type, amount, category, note, date, emoji });
        ok(res, txn);
    } catch (e) { fail(res, e); }
};

exports.deleteTransaction = async (req, res) => {
    try {
        await Finance.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        ok(res, { deleted: req.params.id });
    } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE
// ═══════════════════════════════════════════════════════════════════════════════
exports.getNotes = async (req, res) => {
    try {
        const notes = await Knowledge.find({ userId: req.user._id }).sort({ createdAt: -1 });
        ok(res, notes);
    } catch (e) { fail(res, e); }
};

exports.createNote = async (req, res) => {
    try {
        const { title, type, content, tags, emoji } = req.body;
        const note = await Knowledge.create({ userId: req.user._id, title, type, content, tags, emoji });
        ok(res, note);
    } catch (e) { fail(res, e); }
};

exports.updateNote = async (req, res) => {
    try {
        const note = await Knowledge.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true }
        );
        ok(res, note);
    } catch (e) { fail(res, e); }
};

exports.deleteNote = async (req, res) => {
    try {
        await Knowledge.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        ok(res, { deleted: req.params.id });
    } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GOALS
// ═══════════════════════════════════════════════════════════════════════════════
exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
        ok(res, goals);
    } catch (e) { fail(res, e); }
};

exports.createGoal = async (req, res) => {
    try {
        const { title, area, emoji, progress, deadline, milestones } = req.body;
        const goal = await Goal.create({ userId: req.user._id, title, area, emoji, progress, deadline, milestones });
        ok(res, goal);
    } catch (e) { fail(res, e); }
};

exports.updateGoal = async (req, res) => {
    try {
        const goal = await Goal.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true }
        );
        ok(res, goal);
    } catch (e) { fail(res, e); }
};

exports.deleteGoal = async (req, res) => {
    try {
        await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        ok(res, { deleted: req.params.id });
    } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HEALTH (one doc per day)
// ═══════════════════════════════════════════════════════════════════════════════
exports.getHealthDay = async (req, res) => {
    try {
        const { date } = req.params;   // YYYY-MM-DD
        const doc = await Health.findOne({ userId: req.user._id, date });
        ok(res, doc || null);
    } catch (e) { fail(res, e); }
};

exports.saveHealthDay = async (req, res) => {
    try {
        const { date } = req.params;
        const update = req.body;
        const doc = await Health.findOneAndUpdate(
            { userId: req.user._id, date },
            { ...update, userId: req.user._id, date },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        ok(res, doc);
    } catch (e) { fail(res, e); }
};

// ─── Dashboard stats helper ────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
    try {
        const uid = req.user._id;
        const today = new Date().toISOString().slice(0, 10);

        const [tasksTodayTotal, tasksTodayDone, capturedToday, goalsAll, healthToday] = await Promise.all([
            Task.countDocuments({ userId: uid, tab: 'today' }),
            Task.countDocuments({ userId: uid, tab: 'today', done: true }),
            Capture.countDocuments({ userId: uid, createdAt: { $gte: new Date(today) } }),
            Goal.find({ userId: uid }, 'progress'),
            Health.findOne({ userId: uid, date: today }),
        ]);

        const goalsOnTrack = goalsAll.filter(g => g.progress >= 50).length;

        ok(res, {
            tasksToday: tasksTodayTotal,
            tasksDone: tasksTodayDone,
            capturedToday,
            goalsOnTrack,
            goalsTotal: goalsAll.length,
            habitStreak: healthToday?.habits ? Object.values(healthToday.habits).filter(Boolean).length : 0,
        });
    } catch (e) { fail(res, e); }
};
// ─── Export all data ──────────────────────────────────────────────────────────
exports.exportAllData = async (req, res) => {
    try {
        const uid = req.user._id;
        const [captures, tasks, finance, knowledge, goals, health] = await Promise.all([
            Capture.find({ userId: uid }),
            Task.find({ userId: uid }),
            Finance.find({ userId: uid }),
            Knowledge.find({ userId: uid }),
            Goal.find({ userId: uid }),
            Health.find({ userId: uid }),
        ]);
        const exportData = {
            exportedAt: new Date().toISOString(),
            userId: uid,
            captures, tasks, finance, knowledge, goals, health,
        };
        res.setHeader('Content-Disposition', `attachment; filename="harsh-data-${new Date().toISOString().slice(0, 10)}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(exportData, null, 2));
    } catch (e) { fail(res, e); }
};
