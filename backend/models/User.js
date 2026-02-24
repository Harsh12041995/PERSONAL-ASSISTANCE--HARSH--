const mongoose = require('mongoose');

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

module.exports = mongoose.model('User', UserSchema);
