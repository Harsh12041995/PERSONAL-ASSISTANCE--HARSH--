// backend/services/agent/rag/vectorStore.js
// One interface, two backends — chosen by env.VECTOR_BACKEND:
//   'local'  → app-side cosine similarity over the Mongo `embeddings` collection.
//              Works on any MongoDB (incl. local Community), fully visible in
//              Compass. Ideal for dev and personal-scale data.
//   'atlas'  → native $vectorSearch aggregation (MongoDB Atlas only), fast at
//              scale. Requires a Vector Search index (see docs/DEPLOYMENT.md).
//
// Same API regardless of backend, so tools/RAG code never changes.

const mongoose = require('mongoose');
const Embedding = require('../../../models/Embedding');
const { env } = require('../../../config/env');
const { logger } = require('../../../config/logger');

/** Cosine similarity of two equal-ish length vectors. @param {number[]} a @param {number[]} b */
function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function searchLocal({ userId, vector, k, modules }) {
    const filter = { userId };
    if (modules?.length) filter.module = { $in: modules };
    // Personal-scale: pull candidates and score in memory. Cap to stay fast.
    const candidates = await Embedding.find(filter).limit(2000).lean();
    return candidates
        .map((c) => ({
            text: c.text, module: c.module, sourceId: c.sourceId, meta: c.meta || {},
            score: cosine(vector, c.vector),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
}

async function searchAtlas({ userId, vector, k, modules }) {
    const match = { userId: new mongoose.Types.ObjectId(String(userId)) };
    if (modules?.length) match.module = { $in: modules };
    try {
        return await Embedding.aggregate([
            {
                $vectorSearch: {
                    index: env.VECTOR_INDEX,
                    path: 'vector',
                    queryVector: vector,
                    numCandidates: Math.max(100, k * 20),
                    limit: k,
                    filter: match,
                },
            },
            {
                $project: {
                    _id: 0, text: 1, module: 1, sourceId: 1, meta: 1,
                    score: { $meta: 'vectorSearchScore' },
                },
            },
        ]);
    } catch (err) {
        logger.warn({ err: err.message }, 'Atlas $vectorSearch failed; falling back to local scoring');
        return searchLocal({ userId, vector, k, modules });
    }
}

const VectorStore = {
    /**
     * Upsert one vector for a source document (re-embedding overwrites in place).
     * @param {{userId:string, module:string, sourceId:string, text:string, vector:number[], meta?:object}} doc
     */
    async upsert(doc) {
        await Embedding.updateOne(
            { userId: doc.userId, module: doc.module, sourceId: doc.sourceId },
            { $set: { text: doc.text, vector: doc.vector, meta: doc.meta || {} } },
            { upsert: true },
        );
    },

    /** Remove a source's vector (call when the underlying record is deleted). */
    async remove({ userId, module, sourceId }) {
        await Embedding.deleteOne({ userId, module, sourceId });
    },

    /**
     * Top-k most similar chunks for a query vector, scoped to one user.
     * @param {Object} args
     * @param {string} args.userId
     * @param {number[]} args.vector
     * @param {number} [args.k]
     * @param {string[]} [args.modules]
     * @returns {Promise<Array<{text:string, module:string, sourceId:string, score:number, meta:object}>>}
     */
    async search({ userId, vector, k = 6, modules }) {
        return env.VECTOR_BACKEND === 'atlas'
            ? searchAtlas({ userId, vector, k, modules })
            : searchLocal({ userId, vector, k, modules });
    },
};

module.exports = { VectorStore, cosine };
