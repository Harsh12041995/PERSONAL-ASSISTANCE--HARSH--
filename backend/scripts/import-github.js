// backend/scripts/import-github.js
// One-shot CLI to populate the portfolio from your real GitHub repos.
//
// Usage (from backend/):
//   GITHUB_USER=Harsh12041995 node scripts/import-github.js
//   GITHUB_TOKEN=ghp_xxx node scripts/import-github.js            # private repos too
//   USER_EMAIL=you@example.com node scripts/import-github.js      # target a specific portal user
//   node scripts/import-github.js --active                        # import as active (default: parked)
//
// The token is read from the environment and never printed.

const mongoose = require('mongoose');
const { env } = require('../config/env');
const User = require('../models/User');
const { importUserRepos } = require('../services/ingest/github');

(async () => {
    const active = process.argv.includes('--active');
    const token = env.GITHUB_TOKEN || '';
    const user = env.GITHUB_USER || '';
    if (!token && !user) {
        console.error('❌ Set GITHUB_USER (public repos) or GITHUB_TOKEN (incl. private) in the environment.');
        process.exit(1);
    }

    await mongoose.connect(env.MONGODB_URI);

    // Target user: USER_EMAIL if given, else the first user in the DB (single-user portal).
    const target = process.env.USER_EMAIL
        ? await User.findOne({ email: process.env.USER_EMAIL })
        : await User.findOne({}).sort({ createdAt: 1 });
    if (!target) {
        console.error('❌ No portal user found. Seed a user first (e.g. node seed-harsh.js).');
        process.exit(1);
    }

    console.log(`→ Importing GitHub repos for portal user ${target.email || target._id}${token ? ' (authenticated)' : ` (public repos of ${user})`}...`);
    const summary = await importUserRepos({
        userId: target._id, user, token, importStatus: active ? 'active' : 'parked',
    });
    console.log('✅ Done:', JSON.stringify(summary, null, 2));
    console.log(active ? '' : 'Projects imported as PARKED — open Portfolio and activate your 2–3 focus projects.');

    await mongoose.disconnect();
})().catch((err) => {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
});
