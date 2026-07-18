// backend/scripts/backfill-embeddings.js
// Embed all existing records for one user (or all users) into the vector store.
// Requires Ollama running (for embeddings) and MongoDB reachable.
//
//   node scripts/backfill-embeddings.js <userId>     # one user
//   node scripts/backfill-embeddings.js --all        # every user
//
// View the resulting vectors in MongoDB Compass → `embeddings` collection.

const mongoose = require('mongoose');
const { env } = require('../config/env');
const { logger } = require('../config/logger');
const { backfillUser } = require('../services/agent/rag/ingest');
const User = require('../models/User');

(async () => {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/backfill-embeddings.js <userId|--all>');
        process.exit(1);
    }

    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB for backfill');

    const userIds = arg === '--all'
        ? (await User.find().select('_id').lean()).map((u) => u._id)
        : [arg];

    for (const userId of userIds) {
        const summary = await backfillUser(userId);
        logger.info({ userId: String(userId), summary }, 'Backfill complete');
    }

    await mongoose.disconnect();
    process.exit(0);
})().catch((err) => {
    logger.error({ err: err.message }, 'Backfill failed');
    process.exit(1);
});
