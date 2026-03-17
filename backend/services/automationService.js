const Knowledge = require('../models/Knowledge');
const Capture = require('../models/Capture');
const WorkflowQueueItem = require('../models/WorkflowQueueItem');
const WorkflowDMActivity = require('../models/WorkflowDMActivity');
const aiService = require('../utils/aiService');

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
 * 3. DM Triage & Acknowledge
 * Automatically acknowledges new DMs based on simple rules.
 */
const runDMTriage = async (userId) => {
    const result = await WorkflowDMActivity.updateMany(
        { userId, status: 'new' },
        { status: 'acknowledged' }
    );
    return result.modifiedCount;
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
