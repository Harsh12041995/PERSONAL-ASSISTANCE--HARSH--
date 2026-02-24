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

// ── Budgets ───────────────────────────────────────────────────────────────────
router.get('/budgets', p.getBudgets);
router.post('/budgets', p.upsertBudget);
router.delete('/budgets/:id', p.deleteBudget);

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

// ── Journal (one per day, long-form) ─────────────────────────────────────────
router.get('/journal', p.getJournals);
router.get('/journal/:date', p.getJournalDay);
router.put('/journal/:date', p.saveJournalDay);

// ── Career ────────────────────────────────────────────────────────────────────
router.get('/career/profile', p.getCareerProfile);
router.put('/career/profile', p.saveCareerProfile);

router.get('/career/jobs', p.getJobs);
router.post('/career/jobs', p.createJob);
router.put('/career/jobs/:id', p.updateJob);
router.delete('/career/jobs/:id', p.deleteJob);

router.get('/career/certs', p.getCerts);
router.post('/career/certs', p.createCert);
router.put('/career/certs/:id', p.updateCert);
router.delete('/career/certs/:id', p.deleteCert);

router.get('/career/skills', p.getSkills);
router.post('/career/skills', p.createSkill);
router.put('/career/skills/:id', p.updateSkill);
router.delete('/career/skills/:id', p.deleteSkill);

// ── Social ────────────────────────────────────────────────────────────────────
router.get('/social/contacts', p.getContacts);
router.post('/social/contacts', p.createContact);
router.put('/social/contacts/:id', p.updateContact);
router.delete('/social/contacts/:id', p.deleteContact);

router.get('/social/ideas', p.getContentIdeas);
router.post('/social/ideas', p.createContentIdea);
router.put('/social/ideas/:id', p.updateContentIdea);
router.delete('/social/ideas/:id', p.deleteContentIdea);

router.get('/social/platforms', p.getSocialPlatforms);
router.post('/social/platforms', p.upsertSocialPlatform);
router.delete('/social/platforms/:id', p.deleteSocialPlatform);

// ── Calendar ──────────────────────────────────────────────────────────────────
router.get('/calendar/events', p.getCalendarEvents);
router.post('/calendar/events', p.createCalendarEvent);
router.put('/calendar/events/:id', p.updateCalendarEvent);
router.delete('/calendar/events/:id', p.deleteCalendarEvent);

// ── Workflow Manager ──────────────────────────────────────────────────────────
router.get('/workflow/config', p.getWorkflowConfig);
router.put('/workflow/config', p.saveWorkflowConfig);
router.get('/workflow/queue', p.getWorkflowQueue);
router.post('/workflow/queue', p.createWorkflowQueueItem);
router.put('/workflow/queue/:id', p.updateWorkflowQueueItem);
router.delete('/workflow/queue/:id', p.deleteWorkflowQueueItem);
router.get('/workflow/dm', p.getWorkflowDMActivity);
router.post('/workflow/dm', p.createWorkflowDMActivity);
router.put('/workflow/dm/:id', p.updateWorkflowDMActivity);

// ── User Settings ─────────────────────────────────────────────────────────────
router.get('/settings', p.getSettings);
router.put('/settings', p.saveSettings);

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats', p.getDashboardStats);

// ── Export all data ───────────────────────────────────────────────────────────
router.get('/export', p.exportAllData);

module.exports = router;
