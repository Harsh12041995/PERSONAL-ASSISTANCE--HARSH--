const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    type: { type: String, enum: ['Full-time', 'Part-time', 'Freelance', 'Internship', 'Contract'], default: 'Full-time' },
    status: { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected', 'Active', 'Withdrawn'], default: 'Applied' },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    notes: { type: String, default: '' },
    salary: { type: String, default: '' },
    location: { type: String, default: '' },
    url: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);
