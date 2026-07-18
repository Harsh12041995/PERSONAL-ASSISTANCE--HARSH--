// backend/controllers/ingest.js
// Data sources: RSS feed config + manual runs (protected), and the GitHub
// webhook receiver (unprotected route, HMAC-verified when a secret is set).

const crypto = require('crypto');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError } = require('../utils/AppError');
const { env } = require('../config/env');
const { logger } = require('../config/logger');
const IngestSource = require('../models/IngestSource');
const Project = require('../models/Project');
const ActivityEvent = require('../models/ActivityEvent');
const { runSource } = require('../services/ingest/rss');
const { importUserRepos, registerWebhooks } = require('../services/ingest/github');

// ── RSS sources (protected) ──────────────────────────────────────────────────

const SourceBody = z.object({
    url: z.string().url().max(500),
    label: z.string().max(100).optional(),
    enabled: z.boolean().optional(),
});

/** GET /ingest/sources */
exports.listSources = asyncHandler(async (req, res) => {
    const sources = await IngestSource.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: sources });
});

/** POST /ingest/sources */
exports.createSource = asyncHandler(async (req, res) => {
    const body = SourceBody.parse(req.body);
    const source = await IngestSource.create({ ...body, userId: req.user._id, kind: 'rss' });
    res.status(201).json({ success: true, data: source });
});

/** DELETE /ingest/sources/:id */
exports.deleteSource = asyncHandler(async (req, res) => {
    const source = await IngestSource.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!source) throw AppError.notFound('Source not found');
    res.json({ success: true, data: { deleted: true } });
});

/** POST /ingest/sources/:id/run — pull the feed right now. */
exports.runSourceNow = asyncHandler(async (req, res) => {
    const source = await IngestSource.findOne({ _id: req.params.id, userId: req.user._id });
    if (!source) throw AppError.notFound('Source not found');
    try {
        const result = await runSource(source);
        res.json({ success: true, data: result });
    } catch (err) {
        source.lastRunAt = new Date();
        source.lastStatus = `error: ${err.message}`.slice(0, 200);
        await source.save();
        throw new AppError(`Feed fetch failed: ${err.message}`, 502, { code: 'INGEST_ERROR' });
    }
});

// ── GitHub importer (protected) ──────────────────────────────────────────────

const ImportBody = z.object({
    user: z.string().max(100).optional(),
    importStatus: z.enum(['active', 'parked']).optional(),
    includeForks: z.boolean().optional(),
    includeArchived: z.boolean().optional(),
    maxRepos: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * POST /ingest/github/import — create Project cards from the user's GitHub repos
 * and backfill recent commits. Token/username come from env (never from the client).
 */
exports.importGithub = asyncHandler(async (req, res) => {
    const body = ImportBody.parse(req.body || {});
    const user = body.user || env.GITHUB_USER;
    const token = env.GITHUB_TOKEN || '';
    if (!token && !user) {
        throw AppError.badRequest('Set GITHUB_TOKEN or GITHUB_USER in the backend .env (or pass a username).');
    }
    const summary = await importUserRepos({
        userId: req.user._id, user, token,
        importStatus: body.importStatus || 'parked',
        includeForks: body.includeForks || false,
        includeArchived: body.includeArchived || false,
        maxRepos: body.maxRepos || 100,
    });
    res.json({ success: true, data: summary });
});

/**
 * POST /ingest/github/webhooks — register push/PR/issues webhooks on the user's
 * imported repos, pointing at this deployment's public callback URL.
 */
exports.registerGithubWebhooks = asyncHandler(async (req, res) => {
    const token = env.GITHUB_TOKEN || '';
    if (!token) throw AppError.badRequest('GITHUB_TOKEN with admin:repo_hook scope is required.');
    if (!env.PUBLIC_BASE_URL) throw AppError.badRequest('Set PUBLIC_BASE_URL in the backend .env (your deployed URL).');

    const callbackUrl = `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/v1/hooks/github`;
    const results = await registerWebhooks({
        userId: req.user._id, token, callbackUrl, secret: env.GITHUB_WEBHOOK_SECRET || undefined,
    });
    res.json({ success: true, data: { callbackUrl, results } });
});

// ── GitHub webhook (unprotected; HMAC-verified) ──────────────────────────────

const verifySignature = (req) => {
    if (!env.GITHUB_WEBHOOK_SECRET) return true; // verification opt-in via env
    const signature = req.get('X-Hub-Signature-256') || '';
    if (!req.rawBody) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(req.rawBody).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
};

/**
 * POST /hooks/github — receives push / pull_request / issues events.
 * Matches repository.full_name ("owner/name") against Project.githubRepo and
 * logs activity + bumps lastActivityAt for every matching project.
 */
exports.githubWebhook = asyncHandler(async (req, res) => {
    if (!verifySignature(req)) throw AppError.unauthorized('Invalid webhook signature');

    const event = req.get('X-GitHub-Event') || 'unknown';
    const payload = req.body || {};
    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) return res.json({ success: true, data: { matched: 0, ignored: 'no repository in payload' } });

    const projects = await Project.find({ githubRepo: repoFullName });
    if (!projects.length) return res.json({ success: true, data: { matched: 0 } });

    let summary = `${event} on ${repoFullName}`;
    let url = payload.repository?.html_url || '';
    if (event === 'push') {
        const commits = payload.commits || [];
        const first = commits[0]?.message?.split('\n')[0] || '';
        summary = `${commits.length} commit(s) pushed${first ? `: "${first.slice(0, 100)}"` : ''}`;
        url = payload.compare || url;
    } else if (event === 'pull_request') {
        summary = `PR ${payload.action}: ${payload.pull_request?.title || ''}`.slice(0, 200);
        url = payload.pull_request?.html_url || url;
    } else if (event === 'issues') {
        summary = `Issue ${payload.action}: ${payload.issue?.title || ''}`.slice(0, 200);
        url = payload.issue?.html_url || url;
    }

    for (const project of projects) {
        await ActivityEvent.create({
            userId: project.userId, projectId: project._id,
            source: 'github', type: event, summary, url,
        });
        project.lastActivityAt = new Date();
        await project.save();
    }

    logger.info({ repo: repoFullName, event, matched: projects.length }, 'GitHub webhook processed');
    res.json({ success: true, data: { matched: projects.length } });
});
