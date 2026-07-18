// backend/services/agent/rag/embeddings.js
// Thin wrapper around the provider's embed(). Centralizes text normalization
// so ingestion and query embeddings are produced consistently.

const { provider } = require('../provider/instance');

/** @param {string} text @returns {Promise<number[]>} */
async function embed(text) {
    const clean = (text || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
    if (!clean) return [];
    return provider.embed(clean);
}

module.exports = { embed };
