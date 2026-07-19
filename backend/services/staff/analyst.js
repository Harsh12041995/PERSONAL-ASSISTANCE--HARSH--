// backend/services/staff/analyst.js
// The analyst agent: the Friday kill review. Reads the portfolio, computes
// staleness from real activity, and writes a memo with one blunt question per
// project: "would you start this today?". Kill/park recommendations land in
// the approval queue as decisions — the human always makes the final call.

const { provider } = require('../agent/provider/instance');
const { logger } = require('../../config/logger');
const Project = require('../../models/Project');
const ActivityEvent = require('../../models/ActivityEvent');
const WorkItem = require('../../models/WorkItem');
const Brief = require('../../models/Brief');

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 14;
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY_MS) : null);

async function gatherPortfolio(userId) {
    const projects = await Project.find({ userId, status: { $in: ['active', 'parked'] } }).lean();
    const since7d = new Date(Date.now() - 7 * DAY_MS);

    const rows = [];
    for (const p of projects) {
        const weekEvents = await ActivityEvent.countDocuments({ userId, projectId: p._id, occurredAt: { $gte: since7d } });
        rows.push({
            id: String(p._id),
            name: p.name,
            status: p.status,
            nextAction: p.nextAction,
            attentionCost: p.attentionCost,
            tractionSignal: p.tractionSignal,
            staleDays: daysSince(p.lastActivityAt || p.statusChangedAt),
            eventsThisWeek: weekEvents,
        });
    }
    return rows;
}

function renderTemplateMemo(rows) {
    const lines = [`# Portfolio Review — ${todayISO()}`, '', `_The question for every project: knowing what you know now, would you start it today?_`, ''];
    const active = rows.filter((r) => r.status === 'active');
    if (!active.length) lines.push('- No active projects on record.');
    for (const r of active) {
        const flag = r.staleDays !== null && r.staleDays >= STALE_DAYS ? ` — ⚠️ stale **${r.staleDays}d**, recommend **park**` : '';
        lines.push(`- **${r.name}**: ${r.eventsThisWeek} events this week; next: ${r.nextAction || '_none set_'}${flag}`);
    }
    const parked = rows.filter((r) => r.status === 'parked');
    if (parked.length) {
        lines.push('', `Parked (${parked.length}): ${parked.map((r) => r.name).join(', ')}`);
    }
    return lines.join('\n');
}

async function renderLLMMemo(rows) {
    const message = await provider.chat({
        messages: [
            {
                role: 'system',
                content:
                    'You are a ruthless but fair portfolio analyst for a solo founder running multiple side projects. ' +
                    'From the PORTFOLIO json, write a Friday review memo in markdown, under 300 words. ' +
                    `For each ACTIVE project: one line verdict — DOUBLE DOWN / KEEP / PARK / KILL — with a one-sentence reason grounded in staleDays and eventsThisWeek (>=${STALE_DAYS} stale days = strong park/kill candidate; no nextAction set is a red flag). ` +
                    'End with "This week: focus on <the 2 projects with most momentum>". ' +
                    'Start with "# Portfolio Review — <date>". No preamble.',
            },
            { role: 'user', content: `PORTFOLIO:\n${JSON.stringify(rows, null, 2)}` },
        ],
    });
    const text = (message.content || '').trim();
    if (!text) throw new Error('Empty memo from provider');
    return text;
}

/**
 * Run the portfolio review: store the memo as a Brief and queue a decision
 * WorkItem per stale project. Idempotent per day for the memo; decisions are
 * only created if an identical pending one doesn't already exist.
 */
async function runPortfolioReview(userId) {
    const rows = await gatherPortfolio(userId);

    let content;
    let generatedBy = 'template';
    try {
        content = await renderLLMMemo(rows);
        generatedBy = 'llm';
    } catch (err) {
        logger.warn({ err: err.message }, 'Analyst LLM memo failed — using template fallback');
        content = renderTemplateMemo(rows);
    }

    const brief = await Brief.findOneAndUpdate(
        { userId, kind: 'portfolio', date: todayISO() },
        { content, generatedBy, stats: { projects: rows.length } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Queue one decision per stale active project (skip if already pending).
    let queued = 0;
    for (const r of rows.filter((x) => x.status === 'active' && x.staleDays !== null && x.staleDays >= STALE_DAYS)) {
        const title = `Park or kill "${r.name}"? (${r.staleDays} days without activity)`;
        const exists = await WorkItem.findOne({ userId, type: 'decision', status: 'pending', 'meta.projectId': r.id, title });
        if (exists) continue;
        await WorkItem.create({
            userId,
            type: 'decision',
            agentRole: 'analyst',
            title,
            content:
                `**${r.name}** has had no recorded activity for **${r.staleDays} days** and ${r.eventsThisWeek} events this week.\n\n` +
                `Next action on file: ${r.nextAction || '_none_'}\n\n` +
                `Approve = park it (state is saved, zero mental overhead). Reject = keep it active and commit to the next action this week.`,
            meta: { projectId: r.id },
        });
        queued += 1;
    }

    return { brief, decisionsQueued: queued, projects: rows.length };
}

module.exports = { runPortfolioReview, gatherPortfolio, STALE_DAYS };
