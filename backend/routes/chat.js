const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat');
const { protect } = require('../middleware/auth');

// All chat routes protected
router.use(protect);

// Chat with bot (Ollama)
router.post('/bot', chatController.chatWithBot);

// Conversation management
router.get('/conversations/:id/messages', chatController.getMessages);
router.delete('/conversations/:id', chatController.clearConversation);

module.exports = router;
