// backend/services/ingest/rss.js
// Pulls the user's own blog feed (RSS 2.0 or Atom) into BlogPost records and
// the RAG vector store. Zero dependencies: standard feeds are simple enough
// to parse with a small extractor, and Node 18+ ships global fetch.

const { logger } = require('../../config/logger');
const BlogPost = require('../../models/BlogPost');
const IngestSource = require('../../models/IngestSource');
const ActivityEvent = require('../../models/ActivityEvent');
const { embed } = require('../agent/rag/embeddings');
const { VectorStore } = require('../agent/rag/vectorStore');

// ── Minimal feed parsing ──────────────────────────────────────────────────────

const pick = (xml, tag) => {
    // <tag ...>content</tag>, tolerant of attributes and CDATA
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!m) return '';
    return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
};

const pickAtomLink = (xml) => {
    const m = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
    return m ? m[1] : '';
};

const stripHtml = (html) =>
    html
        .replace(/<\/(p|div|h[1-6]|li|br)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

/**
 * Parse an RSS 2.0 or Atom feed into normalized items.
 * @returns {{guid:string,title:string,link:string,content:string,publishedAt:Date|null}[]}
 */
function parseFeed(xml) {
    const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
    const blockTag = isAtom ? 'entry' : 'item';
    const blocks = xml.match(new RegExp(`<${blockTag}[\\s>][\\s\\S]*?<\\/${blockTag}>`, 'gi')) || [];

    return blocks.map((block) => {
        const title = stripHtml(pick(block, 'title'));
        const link = isAtom ? pickAtomLink(block) : pick(block, 'link');
        const guid = pick(block, isAtom ? 'id' : 'guid') || link || title;
        const rawContent =
            pick(block, 'content:encoded') || pick(block, 'content') || pick(block, 'description') || pick(block, 'summary');
        const dateStr = pick(block, isAtom ? 'published' : 'pubDate') || pick(block, 'updated') || pick(block, 'dc:date');
        const publishedAt = dateStr ? new Date(dateStr) : null;
        return {
            guid,
            title,
            link,
            content: stripHtml(rawContent).slice(0, 20000),
            publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
        };
    }).filter((i) => i.guid && i.title);
}

// ── Ingestion ────────────────────────────────────────────────────────────────

/** Embed a blog post into the RAG store (non-fatal on failure, like ingest.js). */
async function indexBlogPost(post) {
    try {
        const text = `${post.title}\n${(post.content || '').slice(0, 4000)}`.trim();
        const vector = await embed(text);
        if (!vector.length) return;
        await VectorStore.upsert({
            userId: String(post.userId),
            module: 'blogpost',
            sourceId: String(post._id),
            text,
            vector,
            meta: { createdAt: post.publishedAt || post.createdAt },
        });
    } catch (err) {
        logger.warn({ err: err.message }, 'Blog post embedding failed (non-fatal)');
    }
}

/**
 * Fetch one source and upsert its items. Returns { added, total }.
 * New posts also produce an ActivityEvent so they show up in the morning brief.
 */
async function runSource(source) {
    const res = await fetch(source.url, { headers: { 'User-Agent': 'PersonalPortal/1.0 (+ingest)' } });
    if (!res.ok) throw new Error(`Feed responded ${res.status}`);
    const xml = await res.text();
    const items = parseFeed(xml);

    let added = 0;
    for (const item of items) {
        const existing = await BlogPost.findOne({ userId: source.userId, guid: item.guid });
        if (existing) continue;
        const post = await BlogPost.create({ userId: source.userId, ...item });
        await ActivityEvent.create({
            userId: source.userId,
            source: 'rss',
            type: 'post',
            summary: `New blog post: ${item.title}`,
            url: item.link,
            occurredAt: item.publishedAt || new Date(),
        });
        await indexBlogPost(post);
        added += 1;
    }

    source.lastRunAt = new Date();
    source.lastStatus = 'ok';
    source.lastItemCount = items.length;
    await source.save();

    logger.info({ url: source.url, added, total: items.length }, 'RSS ingest run complete');
    return { added, total: items.length };
}

/** Run every enabled source (used by the scheduler). Errors are recorded per-source. */
async function runAllEnabled() {
    const sources = await IngestSource.find({ enabled: true });
    const results = [];
    for (const source of sources) {
        try {
            results.push({ url: source.url, ...(await runSource(source)) });
        } catch (err) {
            source.lastRunAt = new Date();
            source.lastStatus = `error: ${err.message}`.slice(0, 200);
            await source.save();
            logger.warn({ url: source.url, err: err.message }, 'RSS ingest run failed');
            results.push({ url: source.url, error: err.message });
        }
    }
    return results;
}

module.exports = { parseFeed, stripHtml, runSource, runAllEnabled };
