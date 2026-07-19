const Knowledge = require('../models/Knowledge');
const Capture = require('../models/Capture');
const WorkflowQueueItem = require('../models/WorkflowQueueItem');
const WorkflowDMActivity = require('../models/WorkflowDMActivity');
const UserSettings = require('../models/UserSettings');
const aiService = require('../utils/aiService');

// Split a "a, b; c" keyword string into a lowercase list.
const parseKeywords = (s) => (s || '').split(/[,;\n]+/).map(k => k.trim().toLowerCase()).filter(Boolean);
const matchesAny = (text, keywords) => keywords.some(k => text.includes(k));

/**
 * Automation Service
 * Handles background task execution for the Individual Digital Transformation Hub.
 */

/**
 * 1. Auto-Summarizer
 * Scans Knowledge entries and Captures that are not yet refined/summarized.
 */
const runAutoSummarizer = async (userId) => {
    const results = { notes: 0, captures: 0 };

    // Process Knowledge Notes (missing TL;DR)
    const pendingNotes = await Knowledge.find({
        userId,
        content: { $exists: true },
        $or: [{ summary: { $exists: false } }, { summary: '' }]
    }).limit(5);

    for (const note of pendingNotes) {
        if (note.content.length > 150) {
            const summary = await aiService.summarize(note.content);
            await Knowledge.findByIdAndUpdate(note._id, { summary });
            results.notes++;
        }
    }

    // Process Raw Captures (isRefined: false)
    const pendingCaptures = await Capture.find({
        userId,
        isRefined: false,
        text: { $exists: true }
    }).limit(5);

    for (const cap of pendingCaptures) {
        if (cap.text.length > 20) {
            const refined = await aiService.refineTranscript(cap.text);
            await Capture.findByIdAndUpdate(cap._id, {
                text: refined,
                isRefined: true
            });
            results.captures++;
        }
    }

    return results;
};

/**
 * 2. Workflow Queue Processor
 * Moves "Ready" items to "Posted" (simulating execution).
 */
const runQueueProcessor = async (userId) => {
    const result = await WorkflowQueueItem.updateMany(
        { userId, status: 'ready' },
        { status: 'posted', postedAt: new Date() }
    );
    return result.modifiedCount;
};

/**
 * 3. DM Triage
 * Categorizes new DMs using the user's own leadKeywords / urgentKeywords rules
 * (from Settings), instead of blindly flipping everything to "acknowledged":
 *   - message matches a lead keyword     → category 'lead'
 *   - message matches an urgent keyword  → status 'escalated' (needs attention)
 *   - otherwise                          → status 'acknowledged'
 */
const runDMTriage = async (userId) => {
    const settings = await UserSettings.findOne({ userId });
    const rules = settings?.workflowManager?.dmRules || {};
    const leadKw = parseKeywords(rules.leadKeywords);
    const urgentKw = parseKeywords(rules.urgentKeywords);

    const newDMs = await WorkflowDMActivity.find({ userId, status: 'new' });
    let processed = 0;
    for (const dm of newDMs) {
        const text = `${dm.sender} ${dm.message}`.toLowerCase();
        const isLead = leadKw.length && matchesAny(text, leadKw);
        const isUrgent = urgentKw.length && matchesAny(text, urgentKw);
        if (isLead) dm.category = 'lead';
        dm.status = isUrgent ? 'escalated' : 'acknowledged';
        await dm.save();
        processed++;
    }
    return processed;
};

/**
 * Main execution entry point
 */
const executeAll = async (userId) => {
    const summaries = await runAutoSummarizer(userId);
    const queueProcessed = await runQueueProcessor(userId);
    const dmsTriaged = await runDMTriage(userId);

    return {
        summaries,
        queueProcessed,
        dmsTriaged,
        timestamp: new Date()
    };
};

module.exports = {
    runAutoSummarizer,
    runQueueProcessor,
    runDMTriage,
    executeAll
};
