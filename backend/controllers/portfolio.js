// backend/controllers/portfolio.js
// Projects (the portfolio), the decision journal, and the activity feed.

const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError } = require('../utils/AppError');
const Project = require('../models/Project');
const Decision = require('../models/Decision');
const ActivityEvent = require('../models/ActivityEvent');

const slugify = (s) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project';

const ProjectBody = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    status: z.enum(['active', 'parked', 'killed', 'done']).optional(),
    nextAction: z.string().max(500).optional(),
    tractionSignal: z.string().max(500).optional(),
    attentionCost: z.coerce.number().int().min(1).max(5).optional(),
    tags: z.array(z.string().max(40)).max(10).optional(),
    links: z.object({
        repo: z.string().max(300).optional(),
        deploy: z.string().max(300).optional(),
        docs: z.string().max(300).optional(),
    }).optional(),
    githubRepo: z.string().max(200).optional(),
});

// ── Projects ─────────────────────────────────────────────────────────────────

/** GET /portfolio/projects — the whole portfolio, active first. */
exports.listProjects = asyncHandler(async (req, res) => {
    const projects = await Project.find({ userId: req.user._id }).sort({ status: 1, updatedAt: -1 });
    res.json({ success: true, data: projects });
});

/** POST /portfolio/projects */
exports.createProject = asyncHandler(async (req, res) => {
    const body = ProjectBody.parse(req.body);
    let slug = slugify(body.name);
    // De-dupe slug for this user (rare, but "reels vault" twice shouldn't 500).
    if (await Project.findOne({ userId: req.user._id, slug })) slug = `${slug}-${Date.now().toString(36)}`;
    const project = await Project.create({ ...body, userId: req.user._id, slug, lastActivityAt: new Date() });
    res.status(201).json({ success: true, data: project });
});

/** PUT /portfolio/projects/:id */
exports.updateProject = asyncHandler(async (req, res) => {
    const body = ProjectBody.partial().parse(req.body);
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) throw AppError.notFound('Project not found');

    if (body.status && body.status !== project.status) project.statusChangedAt = new Date();
    Object.assign(project, body);
    await project.save();
    res.json({ success: true, data: project });
});

/** DELETE /portfolio/projects/:id */
exports.deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!project) throw AppError.notFound('Project not found');
    await ActivityEvent.deleteMany({ userId: req.user._id, projectId: project._id });
    res.json({ success: true, data: { deleted: true } });
});

/** POST /portfolio/projects/:id/activity — manual "worked on it" note. */
exports.logActivity = asyncHandler(async (req, res) => {
    const { summary } = z.object({ summary: z.string().min(1).max(500) }).parse(req.body);
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) throw AppError.notFound('Project not found');

    const event = await ActivityEvent.create({
        userId: req.user._id, projectId: project._id, source: 'manual', type: 'note', summary,
    });
    project.lastActivityAt = new Date();
    await project.save();
    res.status(201).json({ success: true, data: event });
});

/** GET /portfolio/activity?projectId= — recent activity feed. */
exports.listActivity = asyncHandler(async (req, res) => {
    const filter = { userId: req.user._id };
    if (req.query.projectId) filter.projectId = req.query.projectId;
    const events = await ActivityEvent.find(filter).sort({ occurredAt: -1 }).limit(50);
    res.json({ success: true, data: events });
});

// ── Decision journal ─────────────────────────────────────────────────────────

const DecisionBody = z.object({
    title: z.string().min(1).max(300),
    rationale: z.string().max(4000).optional(),
    projectId: z.string().optional().nullable(),
    reviewAt: z.string().max(10).optional(),
});

/** GET /portfolio/decisions */
exports.listDecisions = asyncHandler(async (req, res) => {
    const decisions = await Decision.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: decisions });
});

/** POST /portfolio/decisions */
exports.createDecision = asyncHandler(async (req, res) => {
    const body = DecisionBody.parse(req.body);
    const decision = await Decision.create({ ...body, userId: req.user._id });
    res.status(201).json({ success: true, data: decision });
});

/** PUT /portfolio/decisions/:id — record outcome / mark reviewed. */
exports.updateDecision = asyncHandler(async (req, res) => {
    const body = DecisionBody.partial().extend({
        outcome: z.string().max(4000).optional(),
        status: z.enum(['open', 'reviewed']).optional(),
    }).parse(req.body);
    const decision = await Decision.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id }, body, { new: true },
    );
    if (!decision) throw AppError.notFound('Decision not found');
    res.json({ success: true, data: decision });
});
