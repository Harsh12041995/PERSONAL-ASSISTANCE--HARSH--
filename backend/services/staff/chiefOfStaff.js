// backend/services/staff/chiefOfStaff.js
// The chief-of-staff agent: assembles the morning brief. Gathers hard facts
// from Mongo, then asks the local LLM to write the narrative. If the LLM is
// unreachable the brief still ships via a deterministic template — the brief
// must arrive every morning regardless of engine state.

const { provider } = require('../agent/provider/instance');
const { logger } = require('../../config/logger');

const Task = require('../../models/Task');
const Capture = require('../../models/Capture');
const Project = require('../../models/Project');
const WorkItem = require('../../models/WorkItem');
const ActivityEvent = require('../../models/ActivityEvent');
const BlogPost = require('../../models/BlogPost');
const Brief = require('../../models/Brief');

const DAY_MS = 24 * 60 * 60 * 1000;
const todayISO = () => new Date().toISOString().slice(0, 10);

const daysSince = (date) => {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
};

/** Collect the facts the brief is written from. Pure data, no prose. */
async function gatherFacts(userId) {
    const since24h = new Date(Date.now() - DAY_MS);

    const [tasks, captures, projects, pendingItems, activity, latestPost] = await Promise.all([
        Task.find({ userId, tab: 'today' }).lean(),
        Capture.find({ userId, createdAt: { $gte: since24h } }).sort({ createdAt: -1 }).limit(10).lean(),
        Project.find({ userId, status: 'active' }).lean(),
        WorkItem.find({ userId, status: 'pending' }).select('type title agentRole').lean(),
        ActivityEvent.find({ userId, occurredAt: { $gte: since24h } }).sort({ occurredAt: -1 }).limit(20).lean(),
        BlogPost.findOne({ userId }).sort({ publishedAt: -1 }).lean(),
    ]);

    const staleProjects = projects
        .map((p) => ({ name: p.name, nextAction: p.nextAction, staleDays: daysSince(p.lastActivityAt || p.statusChangedAt) }))
        .filter((p) => p.staleDays !== null && p.staleDays >= 14);

    return {
        date: todayISO(),
        tasks: { total: tasks.length, done: tasks.filter((t) => t.done).length, open: tasks.filter((t) => !t.done).map((t) => t.title).slice(0, 5) },
        capturesLast24h: captures.map((c) => `${c.type}: ${c.text}`.slice(0, 120)),
        activeProjects: projects.map((p) => ({ name: p.name, nextAction: p.nextAction, staleDays: daysSince(p.lastActivityAt || p.statusChangedAt) })),
        staleProjects,
        pendingApprovals: pendingItems.map((w) => `[${w.type}] ${w.title}`),
        activityLast24h: activity.map((a) => `${a.source}/${a.type}: ${a.summary}`.slice(0, 120)),
        latestBlogPost: latestPost ? { title: latestPost.title, publishedAt: latestPost.publishedAt } : null,
    };
}

/** Deterministic fallback — always works, no LLM required. */
function renderTemplate(facts) {
    const lines = [`# Morning Brief — ${facts.date}`, ''];

    lines.push(`## Today`);
    lines.push(`- Tasks: **${facts.tasks.done}/${facts.tasks.total}** done${facts.tasks.open.length ? ` — open: ${facts.tasks.open.join('; ')}` : ''}`);
    if (facts.pendingApprovals.length) {
        lines.push(`- **${facts.pendingApprovals.length} item(s) waiting for your approval**: ${facts.pendingApprovals.slice(0, 5).join('; ')}`);
    } else {
        lines.push('- Approval queue is clear.');
    }
    lines.push('');

    lines.push('## Portfolio');
    if (!facts.activeProjects.length) {
        lines.push('- No active projects. Add your projects in Portfolio to start tracking.');
    } else {
        for (const p of facts.activeProjects) {
            const stale = p.staleDays !== null && p.staleDays >= 14 ? ` ⚠️ **${p.staleDays} days without activity — park it?**` : '';
            lines.push(`- **${p.name}** — next: ${p.nextAction || '_no next action set_'}${stale}`);
        }
    }
    lines.push('');

    if (facts.activityLast24h.length) {
        lines.push('## What moved (last 24h)');
        for (const a of facts.activityLast24h.slice(0, 8)) lines.push(`- ${a}`);
        lines.push('');
    }
    if (facts.capturesLast24h.length) {
        lines.push('## Captured');
        for (const c of facts.capturesLast24h.slice(0, 5)) lines.push(`- ${c}`);
        lines.push('');
    }
    return lines.join('\n');
}

/** Ask the local LLM to write the narrative from facts. Throws if unreachable. */
async function renderWithLLM(facts) {
    const message = await provider.chat({
        messages: [
            {
                role: 'system',
                content:
                    'You are the chief of staff for a solo founder. Write a morning brief in markdown from the FACTS json. ' +
                    'Rules: under 250 words. Lead with what needs the founder today (open tasks, pending approvals). ' +
                    'Then portfolio: one line per active project; flag anything stale >= 14 days with a blunt "park it?" question. ' +
                    'Then a 2-3 bullet "what moved" section from activity. Exceptions only — skip empty sections entirely. ' +
                    'No preamble, no sign-off. Start with "# Morning Brief — <date>".',
            },
            { role: 'user', content: `FACTS:\n${JSON.stringify(facts, null, 2)}` },
        ],
    });
    const text = (message.content || '').trim();
    if (!text) throw new Error('Empty brief from provider');
    return text;
}

/**
 * Generate (or regenerate) today's morning brief for a user.
 * Upserts on (userId, kind, date) so re-running replaces the day's brief.
 */
async function generateMorningBrief(userId) {
    const facts = await gatherFacts(userId);
    let content;
    let generatedBy = 'template';
    try {
        content = await renderWithLLM(facts);
        generatedBy = 'llm';
    } catch (err) {
        logger.warn({ err: err.message }, 'Brief LLM render failed — using template fallback');
        content = renderTemplate(facts);
    }

    const brief = await Brief.findOneAndUpdate(
        { userId, kind: 'morning', date: facts.date },
        { content, generatedBy, stats: { pendingApprovals: facts.pendingApprovals.length, staleProjects: facts.staleProjects.length } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return brief;
}

module.exports = { generateMorningBrief, gatherFacts, renderTemplate };
