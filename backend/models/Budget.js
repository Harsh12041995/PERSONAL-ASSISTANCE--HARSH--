const mongoose = require('mongoose');

// Budget limits per category
const BudgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
    emoji: { type: String, default: '💰' },
    period: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    color: { type: String, default: '#6366f1' },
}, { timestamps: true });

BudgetSchema.index({ userId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
