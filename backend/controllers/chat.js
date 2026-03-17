const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');

// Helper for responses
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, err, status = 500) => res.status(status).json({ success: false, error: err.message || err });

/**
 * @desc    Send message to Bot (Ollama)
 * @route   POST /api/v1/chat/bot
 */
exports.chatWithBot = async (req, res) => {
    try {
        const { content, conversationId } = req.body;
        const userId = req.user._id;

        if (!content) return fail(res, 'Content is required', 400);

        // 1. Find or Create Conversation
        let conversation;
        if (conversationId && conversationId.startsWith('bot_')) {
            // Virtual ID from frontend
            conversation = await ChatConversation.findOne({ userId, conversation_type: 'bot' });
        } else if (conversationId) {
            // Real Mongo ID
            conversation = await ChatConversation.findById(conversationId);
        }

        if (!conversation) {
            conversation = await ChatConversation.create({
                userId,
                title: content.substring(0, 30) + '...',
                conversation_type: 'bot'
            });
        }

        const cid = conversation._id.toString();

        // 2. Save User Message
        const userMessage = await ChatMessage.create({
            conversation_id: cid,
            sender_type: 'user',
            sender_id: userId.toString(),
            content: content.trim()
        });

        // 3. Call Ollama
        let botText = '';
        const DEFAULT_MODEL = 'qwen3:4b';
        let providerInfo = { name: 'ollama', model: DEFAULT_MODEL };

        try {
            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    messages: [
                        { role: 'user', content: content }
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Ollama error: ${response.statusText} ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            botText = data.message?.content || 'I encountered an error processing that.';
            providerInfo.model = data.model || DEFAULT_MODEL;
        } catch (ollamaErr) {
            console.error('[ChatController] Ollama connection failed:', ollamaErr.message);
            botText = "I'm sorry, I couldn't connect to my local intelligence engine (Ollama). Please ensure it is running and you have pulled the 'qwen3:4b' model.";
            providerInfo.name = 'error-fallback';
        }

        // 4. Save Bot Message
        const botMessage = await ChatMessage.create({
            conversation_id: cid,
            sender_type: 'bot',
            sender_id: 'assistant',
            content: botText,
            metadata: {
                provider: providerInfo.name,
                model: providerInfo.model
            }
        });

        // 5. Update Conversation Metadata
        await ChatConversation.findByIdAndUpdate(cid, {
            lastMessage: { text: botText, timestamp: new Date() }
        });

        ok(res, {
            conversation_id: cid,
            user_message: userMessage,
            bot_message: botMessage
        });

    } catch (e) {
        console.error('[ChatController] Error:', e);
        fail(res, e);
    }
};

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/v1/chat/conversations/:id/messages
 */
exports.getMessages = async (req, res) => {
    try {
        let { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Handle alias
        if (id.startsWith('bot_')) {
            const userId = id.replace('bot_', '');
            const conversation = await ChatConversation.findOne({ userId, conversation_type: 'bot' });
            if (!conversation) return ok(res, { messages: [], pagination: { page: 1, limit, total: 0 } });
            id = conversation._id.toString();
        }

        const messages = await ChatMessage.find({ conversation_id: id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        ok(res, {
            messages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: await ChatMessage.countDocuments({ conversation_id: id })
            }
        });
    } catch (e) {
        fail(res, e);
    }
};

/**
 * @desc    Clear conversation
 * @route   DELETE /api/v1/chat/conversations/:id
 */
exports.clearConversation = async (req, res) => {
    try {
        let { id } = req.params;

        // Handle alias
        if (id.startsWith('bot_')) {
            const userId = id.replace('bot_', '');
            const conversation = await ChatConversation.findOne({ userId, conversation_type: 'bot' });
            if (!conversation) return ok(res, { message: 'Nothing to clear' });
            id = conversation._id.toString();
        }

        await ChatMessage.deleteMany({ conversation_id: id });
        await ChatConversation.findByIdAndDelete(id);
        ok(res, { message: 'Conversation cleared' });
    } catch (e) {
        fail(res, e);
    }
};
