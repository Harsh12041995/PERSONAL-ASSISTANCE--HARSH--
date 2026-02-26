const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    conversation_id: {
        type: String, // String to support both Mongo IDs and temp UUIDs if needed, or ref if preferred
        required: true,
        index: true
    },
    sender_type: {
        type: String,
        enum: ['user', 'bot', 'system'],
        required: true
    },
    sender_id: {
        type: String, // Can be user ID or 'assistant'
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    metadata: {
        provider: String, // e.g., 'ollama', 'gemini'
        model: String,    // e.g., 'llama3'
        tokens: Number
    }
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
