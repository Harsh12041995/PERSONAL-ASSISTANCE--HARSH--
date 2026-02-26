const mongoose = require('mongoose');

const ChatConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'New Conversation'
    },
    conversation_type: {
        type: String,
        enum: ['bot', 'private', 'group'],
        default: 'bot'
    },
    lastMessage: {
        text: String,
        timestamp: { type: Date, default: Date.now }
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('ChatConversation', ChatConversationSchema);
