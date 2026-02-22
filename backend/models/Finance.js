const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'General' },
    note: { type: String, default: '' },
    date: { type: String, required: true },  // YYYY-MM-DD
    emoji: { type: String, default: '💰' },
}, { timestamps: true });

module.exports = mongoose.model('Finance', FinanceSchema);
