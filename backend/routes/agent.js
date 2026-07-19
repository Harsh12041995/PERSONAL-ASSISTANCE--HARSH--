// backend/routes/agent.js
const express = require('express');
const router = express.Router();
const agent = require('../controllers/agent');

// All routes are mounted behind `protect` in server.js (req.user is guaranteed).
router.post('/chat', agent.chat);
router.get('/runs', agent.listRuns);
router.get('/runs/:id', agent.getRun);
router.get('/tools', agent.listTools);
router.get('/health', agent.health);
router.post('/reindex', agent.reindex);

module.exports = router;
