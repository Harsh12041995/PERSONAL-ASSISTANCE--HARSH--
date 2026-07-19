// backend/scripts/hash-passwords.js
// One-shot migration: bcrypt-hash any User whose password is still plaintext
// (pre-hashing scheme). Idempotent — rows already hashed ($2…) are skipped.
// Run once after deploying the password-hashing change:
//   cd backend && node scripts/hash-passwords.js
//
// Note: login also upgrades plaintext rows transparently on next sign-in
// (User.comparePassword), so this script is belt-and-suspenders for users who
// don't log in soon.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');
const User = require('../models/User');

const BCRYPT_RE = /^\$2[aby]\$/;

(async () => {
    await mongoose.connect(env.MONGODB_URI);
    const users = await User.find({}).select('_id email password');
    let hashed = 0, skipped = 0;
    for (const u of users) {
        if (!u.password || BCRYPT_RE.test(u.password)) { skipped += 1; continue; }
        // updateOne bypasses the pre-save hook, so hash explicitly here.
        const digest = await bcrypt.hash(u.password, 10);
        await User.updateOne({ _id: u._id }, { password: digest });
        hashed += 1;
        console.log(`  hashed ${u.email || u._id}`);
    }
    console.log(`✅ Done. Hashed ${hashed}, already-hashed/skipped ${skipped}, total ${users.length}.`);
    await mongoose.disconnect();
})().catch((err) => { console.error('❌ Migration failed:', err.message); process.exit(1); });
