// backend/routes/personal.js
const express = require('express');
const router = express.Router();
const p = require('../controllers/personal');

// ── Captures ──────────────────────────────────────────────────────────────────
router.get('/captures', p.getCaptures);
router.post('/captures', p.createCapture);
router.delete('/captures/:id', p.deleteCapture);

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get('/tasks', p.getTasks);
router.post('/tasks', p.createTask);
router.patch('/tasks/:id', p.updateTask);
router.delete('/tasks/:id', p.deleteTask);

// ── Finance ───────────────────────────────────────────────────────────────────
router.get('/finance', p.getTransactions);
router.post('/finance', p.createTransaction);
router.delete('/finance/:id', p.deleteTransaction);

// ── Knowledge ─────────────────────────────────────────────────────────────────
router.get('/knowledge', p.getNotes);
router.post('/knowledge', p.createNote);
router.put('/knowledge/:id', p.updateNote);
router.delete('/knowledge/:id', p.deleteNote);

// ── Goals ─────────────────────────────────────────────────────────────────────
router.get('/goals', p.getGoals);
router.post('/goals', p.createGoal);
router.put('/goals/:id', p.updateGoal);
router.delete('/goals/:id', p.deleteGoal);

// ── Health (one doc per day) ──────────────────────────────────────────────────
router.get('/health/:date', p.getHealthDay);
router.put('/health/:date', p.saveHealthDay);

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats', p.getDashboardStats);

// ── Export all data ───────────────────────────────────────────────────────────
router.get('/export', p.exportAllData);

module.exports = router;
