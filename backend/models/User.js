const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_RE = /^\$2[aby]\$/;

const UserSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        name: { type: String, default: 'User' },
    },
    permissionMode: {
        type: String,
        enum: ['role', 'custom'],
        default: 'role'
    },
    permissions: [{ type: String }],
    accountConfig: {
        loginAccess: { type: Boolean, default: true },
        mustChangePassword: { type: Boolean, default: false },
        twoFactorRequired: { type: Boolean, default: false }
    },
    company: {
        name: { type: String, default: 'Indra holdings' },
        code: { type: String, default: 'IND' }
    },
    groups: {
        solar_groups: [{ type: String }],
        solar_groups_ids: [{ type: String }]
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'blocked'],
        default: 'approved'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash the password whenever it's set/changed, unless it's already a bcrypt hash.
// (Async pre-hook — no `next`; return/throw controls flow.)
UserSchema.pre('save', async function hashPassword() {
    if (!this.isModified('password')) return;
    if (BCRYPT_RE.test(this.password)) return; // already hashed
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare a candidate password. Handles legacy plaintext rows by verifying
// then transparently upgrading them to a bcrypt hash (migrate-on-login).
UserSchema.methods.comparePassword = async function comparePassword(candidate) {
    const stored = this.password || '';
    if (BCRYPT_RE.test(stored)) {
        return bcrypt.compare(candidate, stored);
    }
    // Legacy plaintext password (pre-hashing scheme) — verify, then upgrade to
    // a hash. Hash explicitly (not via the hook) because re-assigning the same
    // plaintext value wouldn't mark the field modified.
    if (candidate === stored) {
        try {
            this.password = await bcrypt.hash(candidate, 10);
            await this.save();
        } catch { /* upgrade is best-effort */ }
        return true;
    }
    return false;
};

module.exports = mongoose.model('User', UserSchema);
