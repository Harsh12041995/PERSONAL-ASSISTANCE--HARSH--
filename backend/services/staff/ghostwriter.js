// backend/services/staff/ghostwriter.js
// The ghostwriter agent: one unit of experience in, platform-native drafts out.
// Every draft lands in the approval queue (WorkItem) — nothing publishes itself.
// Requires the local LLM; there is no meaningful template fallback for writing.

const { provider } = require('../agent/provider/instance');
const { logger } = require('../../config/logger');
const { AppError } = require('../../utils/AppError');
const WorkItem = require('../../models/WorkItem');
const BlogPost = require('../../models/BlogPost');

const PLATFORMS = [
    {
        key: 'linkedin',
        label: 'LinkedIn post',
        prompt:
            'Rewrite the source as a LinkedIn post: strong first line (no "I\'m excited"), short paragraphs, ' +
            'one concrete lesson or insight, a light question at the end. 120-220 words. No hashtags spam — max 3.',
    },
    {
        key: 'x',
        label: 'X thread',
        prompt:
            'Rewrite the source as an X (Twitter) thread of 4-7 numbered tweets. Tweet 1 is a hook under 200 chars. ' +
            'Each tweet under 270 chars. Concrete, punchy, no fluff. Format: one tweet per line prefixed "1/", "2/", ...',
    },
    {
        key: 'instagram',
        label: 'Reel script',
        prompt:
            'Rewrite the source as a 30-45 second Instagram reel script: HOOK (first 3 seconds, on-screen text), ' +
            'BODY (3-4 beats, spoken lines), CTA (one line). Label each section. Conversational, energetic.',
    },
];

/**
 * Generate platform drafts from a piece of source text and queue them for approval.
 * @returns {Promise<import('mongoose').Document[]>} created WorkItems
 */
async function generateDrafts({ userId, sourceTitle, sourceText, sourceId = '' }) {
    if (!sourceText || !sourceText.trim()) throw AppError.badRequest('sourceText is required');

    const reachable = await provider.ping();
    if (!reachable) {
        throw new AppError('Local AI engine (Ollama) is not reachable — start it to use the ghostwriter.', 503, { code: 'PROVIDER_UNAVAILABLE' });
    }

    const source = `TITLE: ${sourceTitle || '(untitled)'}\n\n${sourceText}`.slice(0, 8000);
    const items = [];

    // Sequential on purpose: local models handle one request at a time best.
    for (const platform of PLATFORMS) {
        try {
            const message = await provider.chat({
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a ghostwriter for a founder who builds AI products and writes daily. ' +
                            'Write in first person, plain language, specific over generic. Output ONLY the content — no preamble, no explanations. ' +
                            platform.prompt,
                    },
                    { role: 'user', content: source },
                ],
            });
            const content = (message.content || '').trim();
            if (!content) continue;

            const item = await WorkItem.create({
                userId,
                type: 'draft',
                agentRole: 'ghostwriter',
                title: `${platform.label}: ${(sourceTitle || 'untitled').slice(0, 80)}`,
                content,
                meta: { platform: platform.key, sourceId },
            });
            items.push(item);
        } catch (err) {
            logger.warn({ platform: platform.key, err: err.message }, 'Ghostwriter draft failed (continuing)');
        }
    }

    if (!items.length) {
        throw new AppError('Ghostwriter produced no drafts (provider error). Try again.', 502, { code: 'PROVIDER_ERROR' });
    }
    return items;
}

/**
 * Nightly job: draft for any ingested blog posts that haven't been ghostwritten yet.
 * Skips silently when the engine is offline — it will catch up next run.
 */
async function runForNewPosts(userId) {
    const posts = await BlogPost.find({ userId, ghostwrittenAt: null }).sort({ publishedAt: -1 }).limit(3);
    if (!posts.length) return { drafted: 0 };

    if (!(await provider.ping())) {
        logger.info('Ghostwriter nightly: engine offline, skipping');
        return { drafted: 0, skipped: 'engine offline' };
    }

    let drafted = 0;
    for (const post of posts) {
        try {
            await generateDrafts({ userId, sourceTitle: post.title, sourceText: post.content || post.title, sourceId: String(post._id) });
            post.ghostwrittenAt = new Date();
            await post.save();
            drafted += 1;
        } catch (err) {
            logger.warn({ post: post.title, err: err.message }, 'Ghostwriter nightly: post failed');
        }
    }
    return { drafted };
}

module.exports = { generateDrafts, runForNewPosts, PLATFORMS };
