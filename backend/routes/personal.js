const express = require('express');
const router = express.Router();
const p = require('../controllers/personal');

// ── Captures ─────────────────────────────────────────────────────────────────
router.get('/captures', p.getCaptures);
router.post('/captures', p.createCapture);
router.put('/captures/:id', p.updateCapture);
router.delete('/captures/:id', p.deleteCapture);

// ── Tasks ────────────────────────────────────────────────────────────────────
router.get('/tasks', p.getTasks);
router.post('/tasks', p.createTask);
router.patch('/tasks/:id', p.updateTask);
router.put('/tasks/:id', p.updateTask);
router.delete('/tasks/:id', p.deleteTask);
router.post('/tasks/analyze', p.analyzeTasks);

// ── Finance ───────────────────────────────────────────────────────────────────
router.get('/finance', p.getTransactions);
router.post('/finance', p.createTransaction);
router.put('/finance/:id', p.updateTransaction);
router.delete('/finance/:id', p.deleteTransaction);
router.get('/budgets', p.getBudgets);
router.post('/budgets', p.upsertBudget);
router.delete('/budgets/:id', p.deleteBudget);

// ── Knowledge ─────────────────────────────────────────────────────────────────
router.get('/knowledge', p.getNotes);
router.post('/knowledge', p.createNote);
router.put('/knowledge/:id', p.updateNote);
router.delete('/knowledge/:id', p.deleteNote);
router.post('/knowledge/:id/summarize', p.summarizeNote);

// ── Goals ─────────────────────────────────────────────────────────────────────
router.get('/goals', p.getGoals);
router.post('/goals', p.createGoal);
router.patch('/goals/:id', p.updateGoal);
router.put('/goals/:id', p.updateGoal);
router.delete('/goals/:id', p.deleteGoal);

// ── Health / Habits ───────────────────────────────────────────────────────────
router.get('/health/:date', p.getHealthDay);
router.post('/health/:date', p.saveHealthDay);
router.put('/health/:date', p.saveHealthDay);

// ── Dashboard / Export ────────────────────────────────────────────────────────
router.get('/dashboard/stats', p.getDashboardStats);
router.get('/export-all', p.exportAllData);

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', p.getSettings);
router.post('/settings', p.saveSettings);
router.put('/settings', p.saveSettings);

// ── AI Intelligence ──────────────────────────────────────────────────────────
router.get('/intelligence/dashboard', p.getAiDashboardInsights);
router.post('/intelligence/refine', p.refineTranscript);
router.post('/intelligence/analyze-image', p.analyzeImage);

// ── Journal ───────────────────────────────────────────────────────────────────
router.get('/journal', p.getJournals);
router.get('/journal/:date', p.getJournalDay);
router.post('/journal/:date', p.saveJournalDay);
router.put('/journal/:date', p.saveJournalDay);

// ── Career ────────────────────────────────────────────────────────────────────
router.get('/career/profile', p.getCareerProfile);
router.post('/career/profile', p.saveCareerProfile);
router.put('/career/profile', p.saveCareerProfile);
router.get('/career/jobs', p.getJobs);
router.post('/career/jobs', p.createJob);
router.patch('/career/jobs/:id', p.updateJob);
router.put('/career/jobs/:id', p.updateJob);
router.delete('/career/jobs/:id', p.deleteJob);
router.get('/career/certs', p.getCerts);
router.post('/career/certs', p.createCert);
router.patch('/career/certs/:id', p.updateCert);
router.put('/career/certs/:id', p.updateCert);
router.delete('/career/certs/:id', p.deleteCert);
router.get('/career/skills', p.getSkills);
router.post('/career/skills', p.createSkill);
router.patch('/career/skills/:id', p.updateSkill);
router.put('/career/skills/:id', p.updateSkill);
router.delete('/career/skills/:id', p.deleteSkill);
router.post('/career/process-cv', p.processCv);
router.post('/career/match-job', p.matchJob);

// ── Social ────────────────────────────────────────────────────────────────────
router.get('/social/contacts', p.getContacts);
router.post('/social/contacts', p.createContact);
router.patch('/social/contacts/:id', p.updateContact);
router.put('/social/contacts/:id', p.updateContact);
router.delete('/social/contacts/:id', p.deleteContact);
router.get('/social/ideas', p.getContentIdeas);
router.post('/social/ideas', p.createContentIdea);
router.patch('/social/ideas/:id', p.updateContentIdea);
router.put('/social/ideas/:id', p.updateContentIdea);
router.delete('/social/ideas/:id', p.deleteContentIdea);
router.get('/social/platforms', p.getSocialPlatforms);
router.post('/social/platforms', p.upsertSocialPlatform);
router.delete('/social/platforms/:id', p.deleteSocialPlatform);

// ── Calendar ──────────────────────────────────────────────────────────────────
router.get('/calendar/events', p.getCalendarEvents);
router.post('/calendar/events', p.createCalendarEvent);
router.patch('/calendar/events/:id', p.updateCalendarEvent);
router.put('/calendar/events/:id', p.updateCalendarEvent);
router.delete('/calendar/events/:id', p.deleteCalendarEvent);

// ── Workflow Manager ─────────────────────────────────────────────────────────
router.get('/workflow/config', p.getWorkflowConfig);
router.post('/workflow/config', p.saveWorkflowConfig);
router.put('/workflow/config', p.saveWorkflowConfig);
router.get('/workflow/queue', p.getWorkflowQueue);
router.post('/workflow/queue', p.createWorkflowQueueItem);
router.patch('/workflow/queue/:id', p.updateWorkflowQueueItem);
router.put('/workflow/queue/:id', p.updateWorkflowQueueItem);
router.delete('/workflow/queue/:id', p.deleteWorkflowQueueItem);
router.get('/workflow/dm-activity', p.getWorkflowDMActivity);
router.post('/workflow/dm-activity', p.createWorkflowDMActivity);
router.patch('/workflow/dm-activity/:id', p.updateWorkflowDMActivity);
router.put('/workflow/dm-activity/:id', p.updateWorkflowDMActivity);

// ── Automation ───────────────────────────────────────────────────────────────
router.post('/automation/run', p.runAutomation);

module.exports = router;
