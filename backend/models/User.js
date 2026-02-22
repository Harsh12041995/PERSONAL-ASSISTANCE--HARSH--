const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Ideally hashed, but keeping simple for local dev as requested
    role: {
        name: { type: String, default: 'Asset Engineer' },
        permissions: [{ type: Object }] // Flexible for now
    },
    company: {
        name: { type: String, default: 'Indra holdings' },
        code: { type: String, default: 'IND' }
    },
    groups: {
        solar_groups: [{ type: String }],
        solar_groups_ids: [{ type: String }]
    }
});

module.exports = mongoose.model('User', UserSchema);
