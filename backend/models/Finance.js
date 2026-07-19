const mongoose = require('mongoose');

const FinanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'General' },
    note: { type: String, default: '' },
    date: { type: String, required: true },  // YYYY-MM-DD
    emoji: { type: String, default: '💰' },
    // Recurring templates: a txn with recurrence != 'none' is a rule, not actual
    // spend — it seeds dated occurrences on read. Occurrences carry recurrence
    // 'none' and point back via recurringId.
    recurrence: { type: String, enum: ['none', 'weekly', 'monthly'], default: 'none' },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'Finance', default: null },
    lastRun: { type: String, default: '' },  // last occurrence date materialized
}, { timestamps: true });

module.exports = mongoose.model('Finance', FinanceSchema);
