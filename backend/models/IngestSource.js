const mongoose = require('mongoose');

// A configured external source the portal pulls from (currently RSS/Atom feeds).
const IngestSourceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['rss'], default: 'rss' },
    url: { type: String, required: true, trim: true },
    label: { type: String, default: 'My blog' },
    enabled: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
    lastStatus: { type: String, default: '' },       // ok | error: <message>
    lastItemCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('IngestSource', IngestSourceSchema);
