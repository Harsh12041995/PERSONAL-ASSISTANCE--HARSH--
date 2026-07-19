// backend/services/agent/rag/ingest.js
// Turns user records into searchable vectors. Call indexRecord() after a record
// is created/updated, and removeRecord() after delete. backfillUser() embeds all
// existing records once (run via scripts or an admin route).

const { embed } = require('./embeddings');
const { VectorStore } = require('./vectorStore');
const { logger } = require('../../../config/logger');

const Capture = require('../../../models/Capture');
const Knowledge = require('../../../models/Knowledge');
const Goal = require('../../../models/Goal');
const Journal = require('../../../models/Journal');

// How to turn each module's document into a single embeddable string.
const RENDERERS = {
    capture: (d) => `${d.type || ''}: ${d.text || ''}`,
    knowledge: (d) => `${d.title || ''}\n${d.content || d.body || d.notes || ''}`,
    goal: (d) => `Goal: ${d.title || ''}. ${d.description || ''}`,
    journal: (d) => `${d.title || ''}\n${d.content || d.text || ''}`,
};

const MODELS = { capture: Capture, knowledge: Knowledge, goal: Goal, journal: Journal };

/**
 * Embed and upsert one record into the vector store.
 * @param {string} module one of: capture | knowledge | goal | journal
 * @param {object} doc the mongoose document (or plain object) with _id + userId
 */
async function indexRecord(module, doc) {
    const render = RENDERERS[module];
    if (!render || !doc) return;
    const text = render(doc).trim();
    if (!text) return;
    try {
        const vector = await embed(text);
        if (!vector.length) return;
        await VectorStore.upsert({
            userId: String(doc.userId),
            module,
            sourceId: String(doc._id),
            text,
            vector,
            meta: { createdAt: doc.createdAt },
        });
    } catch (err) {
        // Ingestion must never break the user's write path.
        logger.warn({ module, err: err.message }, 'Embedding ingest failed (non-fatal)');
    }
}

async function removeRecord(module, sourceId, userId) {
    try {
        await VectorStore.remove({ userId: String(userId), module, sourceId: String(sourceId) });
    } catch (err) {
        logger.warn({ module, err: err.message }, 'Embedding remove failed');
    }
}

/**
 * One-time (or re-runnable) backfill of all existing records for a user.
 * @returns {Promise<{module:string,count:number}[]>}
 */
async function backfillUser(userId) {
    const summary = [];
    for (const [module, Model] of Object.entries(MODELS)) {
        const docs = await Model.find({ userId }).lean();
        let count = 0;
        for (const d of docs) {
            await indexRecord(module, d);
            count += 1;
        }
        summary.push({ module, count });
        logger.info({ module, count, userId: String(userId) }, 'Backfilled embeddings');
    }
    return summary;
}

module.exports = { indexRecord, removeRecord, backfillUser, RENDERERS };
