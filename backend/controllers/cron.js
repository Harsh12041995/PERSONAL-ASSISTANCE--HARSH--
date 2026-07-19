// backend/controllers/cron.js
// Machine-triggered job runner for deployments where the in-process scheduler
// can't run (serverless). Authed by a shared X-Service-Token, NOT a user JWT —
// each job internally iterates all users (see services/scheduler.js JOBS).
const { env } = require('../config/env');
const { JOBS } = require('../services/scheduler');
const { logger } = require('../config/logger');

/** POST /cron/run  body: { job: '<name>' | 'all' }  header: X-Service-Token */
exports.runCron = async (req, res) => {
    if (!env.SERVICE_TOKEN) {
        return res.status(503).json({ success: false, error: 'Cron endpoint disabled — set SERVICE_TOKEN in the backend env.' });
    }
    const token = req.headers['x-service-token'];
    if (token !== env.SERVICE_TOKEN) {
        return res.status(401).json({ success: false, error: 'Invalid service token' });
    }

    const which = (req.body && req.body.job) || 'all';
    const jobs = which === 'all' ? JOBS : JOBS.filter((j) => j.name === which);
    if (jobs.length === 0) {
        return res.status(400).json({ success: false, error: `Unknown job "${which}". Valid: ${JOBS.map(j => j.name).join(', ')}, all` });
    }

    const ran = [];
    for (const job of jobs) {
        try {
            await job.run();
            ran.push({ job: job.name, ok: true });
        } catch (err) {
            logger.error({ job: job.name, err: err.message }, 'Cron job failed');
            ran.push({ job: job.name, ok: false, error: err.message });
        }
    }
    res.json({ success: true, data: { ran } });
};
