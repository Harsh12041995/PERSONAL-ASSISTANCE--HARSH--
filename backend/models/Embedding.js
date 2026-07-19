const mongoose = require('mongoose');

// A single vectorized chunk of the user's data. Kept in MongoDB (not a separate
// vector DB) so everything stays in one place, fully inspectable in Compass and
// under your control. `vector` is the embedding produced by Ollama.
//
// For local dev we score similarity in the app (cosine). In production on
// MongoDB Atlas, create a Vector Search index named per env.VECTOR_INDEX over
// the `vector` field (see docs/DEPLOYMENT.md) to use native $vectorSearch.
const EmbeddingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: { type: String, required: true, index: true }, // capture | knowledge | goal | journal | task
    sourceId: { type: String, required: true },             // the source document's _id
    text: { type: String, required: true },                 // the chunk that was embedded
    vector: { type: [Number], required: true },             // embedding
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// One vector per (user, module, source) — re-embedding upserts in place.
EmbeddingSchema.index({ userId: 1, module: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.model('Embedding', EmbeddingSchema);
