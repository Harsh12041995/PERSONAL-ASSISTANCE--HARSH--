// backend/controllers/personal.js
// Handles all personal module CRUD for Harsh's assistant

const Capture = require('../models/Capture');
const Task = require('../models/Task');
const Finance = require('../models/Finance');
const Knowledge = require('../models/Knowledge');
const Goal = require('../models/Goal');
const Health = require('../models/Health');
const Budget = require('../models/Budget');
const Journal = require('../models/Journal');
const CareerProfile = require('../models/CareerProfile');
const Job = require('../models/Job');
const Certification = require('../models/Certification');
const Skill = require('../models/Skill');
const Contact = require('../models/Contact');
const ContentIdea = require('../models/ContentIdea');
const SocialPlatform = require('../models/SocialPlatform');
const UserSettings = require('../models/UserSettings');
const CalendarEvent = require('../models/CalendarEvent');
const WorkflowQueueItem = require('../models/WorkflowQueueItem');
const WorkflowDMActivity = require('../models/WorkflowDMActivity');
const aiService = require('../utils/aiService');

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
        const { type, text, emoji, rawText, isRefined } = req.body;
        const capture = await Capture.create({
            userId: req.user._id,
            type,
            text,
            emoji,
            rawText: rawText || text,
            isRefined: isRefined || false
        });
        ok(res, capture);
    } catch (e) { fail(res, e); }
};

exports.updateCapture = async (req, res) => {
    try {
        const capture = await Capture.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true }
        );
        if (!capture) return fail(res, 'Capture not found', 404);
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

exports.analyzeTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id, done: false });
        if (tasks.length === 0) return ok(res, "No active tasks to analyze.");

        const analysis = await aiService.analyzeTasks(tasks);
        ok(res, analysis);
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

exports.summarizeNote = async (req, res) => {
    try {
        const note = await Knowledge.findOne({ _id: req.params.id, userId: req.user._id });
        if (!note) return fail(res, 'Note not found', 404);

        const summary = await aiService.summarize(note.content);
        ok(res, summary);
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

exports.getAiDashboardInsights = async (req, res) => {
    try {
        const uid = req.user._id;
        const today = new Date().toISOString().slice(0, 10);

        const [stats, tasks] = await Promise.all([
            Task.aggregate([
                { $match: { userId: uid } },
                { $group: { _id: '$done', count: { $sum: 1 } } }
            ]),
            Task.find({ userId: uid, done: false }).limit(5)
        ]);

        const prompt = `Based on these stats, give me 3 super-short proactive "Smart Insights" or encouragements for my dashboard. One for productivity, one for mindset, and one general tip. Keep each insight under 12 words.\n\nStats: ${JSON.stringify(stats)}\nNext tasks: ${tasks.map(t => t.title).join(', ')}`;

        const insights = await aiService.generateText(prompt, "You are a proactive life coach. Be inspiring and extremely concise.");
        ok(res, insights.split('\n').filter(line => line.trim().length > 0));
    } catch (e) { fail(res, e); }
};

exports.refineTranscript = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return fail(res, 'No text provided', 400);

        const refined = await aiService.refineTranscript(text);
        ok(res, refined);
    } catch (e) { fail(res, e); }
};
// ─── Export all data ──────────────────────────────────────────────────────────
exports.exportAllData = async (req, res) => {
    try {
        const uid = req.user._id;
        const [captures, tasks, finance, budgets, knowledge, goals, health, journals,
            careerProfile, jobs, certs, skills, contacts, ideas, platforms, settings] = await Promise.all([
                Capture.find({ userId: uid }),
                Task.find({ userId: uid }),
                Finance.find({ userId: uid }),
                Budget.find({ userId: uid }),
                Knowledge.find({ userId: uid }),
                Goal.find({ userId: uid }),
                Health.find({ userId: uid }),
                Journal.find({ userId: uid }),
                CareerProfile.findOne({ userId: uid }),
                Job.find({ userId: uid }),
                Certification.find({ userId: uid }),
                Skill.find({ userId: uid }),
                Contact.find({ userId: uid }),
                ContentIdea.find({ userId: uid }),
                SocialPlatform.find({ userId: uid }),
                UserSettings.findOne({ userId: uid }),
            ]);
        const exportData = {
            exportedAt: new Date().toISOString(),
            userId: uid,
            captures, tasks, finance, budgets, knowledge, goals, health, journals,
            career: { profile: careerProfile, jobs, certs, skills },
            social: { contacts, ideas, platforms },
            settings,
        };
        res.setHeader('Content-Disposition', `attachment; filename="harsh-data-${new Date().toISOString().slice(0, 10)}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(exportData, null, 2));
    } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  BUDGETS
// ═══════════════════════════════════════════════════════════════════════════════
exports.getBudgets = async (req, res) => {
    try { ok(res, await Budget.find({ userId: req.user._id })); } catch (e) { fail(res, e); }
};
exports.upsertBudget = async (req, res) => {
    try {
        const b = await Budget.findOneAndUpdate(
            { userId: req.user._id, category: req.body.category },
            { ...req.body, userId: req.user._id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ok(res, b);
    } catch (e) { fail(res, e); }
};
exports.deleteBudget = async (req, res) => {
    try { await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  JOURNAL
// ═══════════════════════════════════════════════════════════════════════════════
exports.getJournals = async (req, res) => {
    try { ok(res, await Journal.find({ userId: req.user._id }).sort({ date: -1 }).limit(30)); } catch (e) { fail(res, e); }
};
exports.getJournalDay = async (req, res) => {
    try {
        const j = await Journal.findOne({ userId: req.user._id, date: req.params.date });
        ok(res, j || { date: req.params.date, content: '', mood: '🙂', tags: [] });
    } catch (e) { fail(res, e); }
};
exports.saveJournalDay = async (req, res) => {
    try {
        const body = { ...req.body, userId: req.user._id, date: req.params.date };
        if (body.content) body.wordCount = body.content.trim().split(/\s+/).length;
        const j = await Journal.findOneAndUpdate(
            { userId: req.user._id, date: req.params.date },
            body, { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ok(res, j);
    } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CAREER
// ═══════════════════════════════════════════════════════════════════════════════
exports.getCareerProfile = async (req, res) => {
    try {
        const p = await CareerProfile.findOne({ userId: req.user._id });
        ok(res, p || {});
    } catch (e) { fail(res, e); }
};
exports.saveCareerProfile = async (req, res) => {
    try {
        const p = await CareerProfile.findOneAndUpdate(
            { userId: req.user._id },
            { ...req.body, userId: req.user._id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ok(res, p);
    } catch (e) { fail(res, e); }
};

exports.getJobs = async (req, res) => { try { ok(res, await Job.find({ userId: req.user._id }).sort({ createdAt: -1 })); } catch (e) { fail(res, e); } };
exports.createJob = async (req, res) => { try { ok(res, await Job.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); } };
exports.updateJob = async (req, res) => { try { ok(res, await Job.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); } };
exports.deleteJob = async (req, res) => { try { await Job.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); } };

exports.getCerts = async (req, res) => { try { ok(res, await Certification.find({ userId: req.user._id }).sort({ createdAt: -1 })); } catch (e) { fail(res, e); } };
exports.createCert = async (req, res) => { try { ok(res, await Certification.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); } };
exports.updateCert = async (req, res) => { try { ok(res, await Certification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); } };
exports.deleteCert = async (req, res) => { try { await Certification.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); } };

exports.getSkills = async (req, res) => { try { ok(res, await Skill.find({ userId: req.user._id }).sort({ level: -1 })); } catch (e) { fail(res, e); } };
exports.createSkill = async (req, res) => { try { ok(res, await Skill.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); } };
exports.updateSkill = async (req, res) => { try { ok(res, await Skill.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); } };
exports.deleteSkill = async (req, res) => { try { await Skill.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); } };

// ═══════════════════════════════════════════════════════════════════════════════
//  SOCIAL
// ═══════════════════════════════════════════════════════════════════════════════
exports.getContacts = async (req, res) => { try { ok(res, await Contact.find({ userId: req.user._id }).sort({ lastTalked: 1 })); } catch (e) { fail(res, e); } };
exports.createContact = async (req, res) => { try { ok(res, await Contact.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); } };
exports.updateContact = async (req, res) => { try { ok(res, await Contact.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); } };
exports.deleteContact = async (req, res) => { try { await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); } };

exports.getContentIdeas = async (req, res) => { try { ok(res, await ContentIdea.find({ userId: req.user._id }).sort({ createdAt: -1 })); } catch (e) { fail(res, e); } };
exports.createContentIdea = async (req, res) => { try { ok(res, await ContentIdea.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); } };
exports.updateContentIdea = async (req, res) => { try { ok(res, await ContentIdea.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); } };
exports.deleteContentIdea = async (req, res) => { try { await ContentIdea.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); } };

exports.getSocialPlatforms = async (req, res) => { try { ok(res, await SocialPlatform.find({ userId: req.user._id })); } catch (e) { fail(res, e); } };
exports.upsertSocialPlatform = async (req, res) => {
    try {
        const sp = await SocialPlatform.findOneAndUpdate(
            { userId: req.user._id, platform: req.body.platform },
            { ...req.body, userId: req.user._id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ok(res, sp);
    } catch (e) { fail(res, e); }
};
exports.deleteSocialPlatform = async (req, res) => { try { await SocialPlatform.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); } };

// ═══════════════════════════════════════════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════
exports.getCalendarEvents = async (req, res) => {
    try { ok(res, await CalendarEvent.find({ userId: req.user._id }).sort({ start: 1, createdAt: -1 })); } catch (e) { fail(res, e); }
};
exports.createCalendarEvent = async (req, res) => {
    try { ok(res, await CalendarEvent.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); }
};
exports.updateCalendarEvent = async (req, res) => {
    try { ok(res, await CalendarEvent.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); }
};
exports.deleteCalendarEvent = async (req, res) => {
    try { await CalendarEvent.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  WORKFLOW MANAGER
// ═══════════════════════════════════════════════════════════════════════════════
const workflowDefaultConfig = {
    connections: { instagram: false, googleDrive: false, captionEngine: false },
    ioPoints: {
        driveInputFolderId: '',
        dmInputMode: 'webhook',
        instagramOutputAccountId: '',
        archiveOutputFolderId: '',
        alertOutputChannel: 'in-app',
    },
    dmRules: {
        leadKeywords: 'collab, partnership, pricing, sponsor',
        urgentKeywords: 'refund, issue, problem, urgent',
        autoAcknowledge: true,
        slaMinutes: 30,
    },
    browserWorkspace: {
        homeUrl: 'https://chatgpt.com',
        allowedDomains: 'chatgpt.com,claude.ai,gemini.google.com',
        allowAnyUrl: true,
        sessionTracking: true,
        recordingEnabled: true,
        integrationWebhookUrl: '',
        integrationAuthToken: '',
        emitVisitEvents: true,
        emitRecordingEvents: true,
        socialMode: true,
    },
};

exports.getWorkflowConfig = async (req, res) => {
    try {
        const s = await UserSettings.findOne({ userId: req.user._id });
        ok(res, s?.workflowManager || workflowDefaultConfig);
    } catch (e) { fail(res, e); }
};

exports.saveWorkflowConfig = async (req, res) => {
    try {
        const payload = req.body || {};
        const settings = await UserSettings.findOneAndUpdate(
            { userId: req.user._id },
            {
                userId: req.user._id,
                workflowManager: {
                    connections: { ...workflowDefaultConfig.connections, ...(payload.connections || {}) },
                    ioPoints: { ...workflowDefaultConfig.ioPoints, ...(payload.ioPoints || {}) },
                    dmRules: { ...workflowDefaultConfig.dmRules, ...(payload.dmRules || {}) },
                    browserWorkspace: { ...workflowDefaultConfig.browserWorkspace, ...(payload.browserWorkspace || {}) },
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ok(res, settings.workflowManager);
    } catch (e) { fail(res, e); }
};

exports.getWorkflowQueue = async (req, res) => {
    try { ok(res, await WorkflowQueueItem.find({ userId: req.user._id }).sort({ createdAt: -1 })); } catch (e) { fail(res, e); }
};
exports.createWorkflowQueueItem = async (req, res) => {
    try { ok(res, await WorkflowQueueItem.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); }
};
exports.updateWorkflowQueueItem = async (req, res) => {
    try { ok(res, await WorkflowQueueItem.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); }
};
exports.deleteWorkflowQueueItem = async (req, res) => {
    try { await WorkflowQueueItem.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); ok(res, {}); } catch (e) { fail(res, e); }
};

exports.getWorkflowDMActivity = async (req, res) => {
    try { ok(res, await WorkflowDMActivity.find({ userId: req.user._id }).sort({ createdAt: -1 })); } catch (e) { fail(res, e); }
};
exports.createWorkflowDMActivity = async (req, res) => {
    try { ok(res, await WorkflowDMActivity.create({ ...req.body, userId: req.user._id })); } catch (e) { fail(res, e); }
};
exports.updateWorkflowDMActivity = async (req, res) => {
    try { ok(res, await WorkflowDMActivity.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true })); } catch (e) { fail(res, e); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
exports.getSettings = async (req, res) => {
    try {
        const s = await UserSettings.findOne({ userId: req.user._id });
        ok(res, s || {});
    } catch (e) { fail(res, e); }
};
exports.saveSettings = async (req, res) => {
    try {
        const s = await UserSettings.findOneAndUpdate(
            { userId: req.user._id },
            { ...req.body, userId: req.user._id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ok(res, s);
    } catch (e) { fail(res, e); }
};
