// backend/routes/portfolio.js
const express = require('express');
const router = express.Router();
const portfolio = require('../controllers/portfolio');

// All routes are mounted behind `protect` in server.js (req.user is guaranteed).
router.get('/projects', portfolio.listProjects);
router.post('/projects', portfolio.createProject);
router.put('/projects/:id', portfolio.updateProject);
router.delete('/projects/:id', portfolio.deleteProject);
router.post('/projects/:id/activity', portfolio.logActivity);

router.get('/activity', portfolio.listActivity);

router.get('/decisions', portfolio.listDecisions);
router.post('/decisions', portfolio.createDecision);
router.put('/decisions/:id', portfolio.updateDecision);

module.exports = router;
