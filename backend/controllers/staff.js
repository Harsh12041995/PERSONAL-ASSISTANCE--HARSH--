// backend/controllers/staff.js
// The CEO interface: approval queue, briefs, and manual triggers for the
// staff agents (chief of staff, ghostwriter, analyst).

const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError } = require('../utils/AppError');
const WorkItem = require('../models/WorkItem');
const Brief = require('../models/Brief');
const BlogPost = require('../models/BlogPost');
const Project = require('../models/Project');
const { generateMorningBrief } = require('../services/staff/chiefOfStaff');
const { generateDrafts } = require('../services/staff/ghostwriter');
const { runPortfolioReview } = require('../services/staff/analyst');

const todayISO = () => new Date().toISOString().slice(0, 10);

// ── Approval queue ───────────────────────────────────────────────────────────

/** GET /staff/queue?status=pending — the approval queue, newest first. */
exports.listQueue = asyncHandler(async (req, res) => {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
    const items = await WorkItem.find({ userId: req.user._id, status }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: items });
});

const ReviewBody = z.object({ editedContent: z.string().max(20000).optional() });

/** POST /staff/queue/:id/approve — approve (optionally with edits). */
exports.approveItem = asyncHandler(async (req, res) => {
    const { editedContent } = ReviewBody.parse(req.body || {});
    const item = await WorkItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) throw AppError.notFound('Work item not found');
    if (item.status !== 'pending') throw AppError.badRequest('Item already reviewed');

    item.status = 'approved';
    if (editedContent !== undefined) item.editedContent = editedContent;
    item.reviewedAt = new Date();
    await item.save();

    // Approving an analyst "park?" decision actually parks the project.
    if (item.type === 'decision' && item.agentRole === 'analyst' && item.meta?.projectId) {
        await Project.findOneAndUpdate(
            { _id: item.meta.projectId, userId: req.user._id, status: 'active' },
            { status: 'parked', statusChangedAt: new Date() },
        );
    }
    res.json({ success: true, data: item });
});

/** POST /staff/queue/:id/reject */
exports.rejectItem = asyncHandler(async (req, res) => {
    const item = await WorkItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) throw AppError.notFound('Work item not found');
    if (item.status !== 'pending') throw AppError.badRequest('Item already reviewed');
    item.status = 'rejected';
    item.reviewedAt = new Date();
    await item.save();
    res.json({ success: true, data: item });
});

/** PUT /staff/queue/:id — save edits without deciding yet. */
exports.editItem = asyncHandler(async (req, res) => {
    const { editedContent } = z.object({ editedContent: z.string().max(20000) }).parse(req.body);
    const item = await WorkItem.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id, status: 'pending' },
        { editedContent },
        { new: true },
    );
    if (!item) throw AppError.notFound('Pending work item not found');
    res.json({ success: true, data: item });
});

// ── Briefs ───────────────────────────────────────────────────────────────────

/** GET /staff/brief/today — today's morning brief (404 if not generated yet). */
exports.todayBrief = asyncHandler(async (req, res) => {
    const brief = await Brief.findOne({ userId: req.user._id, kind: 'morning', date: todayISO() });
    if (!brief) throw AppError.notFound('No brief generated for today yet');
    res.json({ success: true, data: brief });
});

/** GET /staff/briefs?kind=morning — recent briefs. */
exports.listBriefs = asyncHandler(async (req, res) => {
    const kind = ['morning', 'portfolio'].includes(req.query.kind) ? req.query.kind : undefined;
    const filter = { userId: req.user._id, ...(kind ? { kind } : {}) };
    const briefs = await Brief.find(filter).sort({ date: -1 }).limit(14);
    res.json({ success: true, data: briefs });
});

/** POST /staff/brief/run — generate (or regenerate) today's brief now. */
exports.runBrief = asyncHandler(async (req, res) => {
    const brief = await generateMorningBrief(req.user._id);
    res.json({ success: true, data: brief });
});

// ── Ghostwriter ──────────────────────────────────────────────────────────────

const GhostwriteBody = z.object({
    sourceType: z.enum(['text', 'blogpost']),
    text: z.string().max(20000).optional(),
    title: z.string().max(300).optional(),
    blogPostId: z.string().optional(),
});

/** POST /staff/ghostwrite — turn source text or an ingested post into drafts. */
exports.ghostwrite = asyncHandler(async (req, res) => {
    const body = GhostwriteBody.parse(req.body);

    let sourceTitle = body.title || '';
    let sourceText = body.text || '';
    let sourceId = '';

    if (body.sourceType === 'blogpost') {
        const post = await BlogPost.findOne({ _id: body.blogPostId, userId: req.user._id });
        if (!post) throw AppError.notFound('Blog post not found');
        sourceTitle = post.title;
        sourceText = post.content || post.title;
        sourceId = String(post._id);
        post.ghostwrittenAt = new Date();
        await post.save();
    }

    const items = await generateDrafts({ userId: req.user._id, sourceTitle, sourceText, sourceId });
    res.json({ success: true, data: items });
});

/** GET /staff/posts — recent ingested blog posts (ghostwriter source picker). */
exports.listPosts = asyncHandler(async (req, res) => {
    const posts = await BlogPost.find({ userId: req.user._id })
        .sort({ publishedAt: -1, createdAt: -1 }).limit(20)
        .select('title link publishedAt ghostwrittenAt');
    res.json({ success: true, data: posts });
});

// ── Analyst ──────────────────────────────────────────────────────────────────

/** POST /staff/review/run — run the portfolio kill review now. */
exports.runReview = asyncHandler(async (req, res) => {
    const result = await runPortfolioReview(req.user._id);
    res.json({ success: true, data: result });
});
