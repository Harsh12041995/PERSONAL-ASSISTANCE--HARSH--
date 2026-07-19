// backend/services/ingest/github.js
// GitHub API client + importer. Turns your real repos into portfolio Projects
// and backfills recent commits as ActivityEvents. Zero dependencies (global
// fetch). Works unauthenticated for public repos; a token unlocks private repos
// and higher rate limits.

const { logger } = require('../../config/logger');
const { env } = require('../../config/env');
const Project = require('../../models/Project');
const ActivityEvent = require('../../models/ActivityEvent');

const API = 'https://api.github.com';

const ghHeaders = (token) => ({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'PersonalPortal/1.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function ghGet(path, token) {
    const res = await fetch(`${API}${path}`, { headers: ghHeaders(token) });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const msg = res.status === 403 && body.includes('rate limit')
            ? 'GitHub API rate limit hit — add a token to raise the limit.'
            : `GitHub API ${res.status} on ${path}`;
        throw new Error(msg);
    }
    return res.json();
}

const slugify = (s) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project';

/**
 * List repos. With a token, uses /user/repos (includes private + collaborations);
 * otherwise /users/:user/repos (public only). Sorted by most recently pushed.
 */
async function listRepos({ user, token, maxRepos = 100 }) {
    const path = token
        ? `/user/repos?per_page=${Math.min(maxRepos, 100)}&sort=pushed&affiliation=owner`
        : `/users/${encodeURIComponent(user)}/repos?per_page=${Math.min(maxRepos, 100)}&sort=pushed`;
    const repos = await ghGet(path, token);
    return repos.map((r) => ({
        name: r.name,
        fullName: r.full_name,
        description: r.description || '',
        htmlUrl: r.html_url,
        pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
        language: r.language || '',
        archived: !!r.archived,
        fork: !!r.fork,
        topics: r.topics || [],
    }));
}

/** Recent commits for one repo, newest first. */
async function listRecentCommits({ fullName, token, perPage = 10 }) {
    try {
        const commits = await ghGet(`/repos/${fullName}/commits?per_page=${perPage}`, token);
        return commits.map((c) => ({
            sha: c.sha,
            message: (c.commit?.message || '').split('\n')[0],
            url: c.html_url,
            date: c.commit?.author?.date ? new Date(c.commit.author.date) : null,
        }));
    } catch (err) {
        // Empty repos 409; don't let one repo abort the whole import.
        logger.warn({ fullName, err: err.message }, 'Commit fetch skipped');
        return [];
    }
}

/**
 * Import a user's repos as Projects (idempotent — matches on githubRepo) and
 * backfill recent commits as ActivityEvents (deduped by commit URL).
 *
 * @param {object} o
 * @param {string} o.userId owning user
 * @param {string} [o.user] GitHub username (required when no token)
 * @param {string} [o.token] GitHub token (from env; never logged)
 * @param {'active'|'parked'} [o.importStatus='parked'] status for newly imported projects
 * @param {boolean} [o.includeForks=false]
 * @param {boolean} [o.includeArchived=false]
 * @param {number} [o.maxRepos=100]
 */
async function importUserRepos({
    userId, user, token,
    importStatus = 'parked', includeForks = false, includeArchived = false, maxRepos = 100,
}) {
    if (!token && !user) throw new Error('A GitHub username or token is required');

    let repos = await listRepos({ user, token, maxRepos });
    if (!includeForks) repos = repos.filter((r) => !r.fork);
    if (!includeArchived) repos = repos.filter((r) => !r.archived);

    let created = 0;
    let updated = 0;
    let events = 0;

    for (const repo of repos) {
        // Upsert project by githubRepo for this user.
        let project = await Project.findOne({ userId, githubRepo: repo.fullName });
        if (!project) {
            let slug = slugify(repo.name);
            if (await Project.findOne({ userId, slug })) slug = `${slug}-${repo.fullName.split('/')[0]}`;
            project = await Project.create({
                userId,
                name: repo.name,
                slug,
                description: repo.description,
                status: importStatus,
                githubRepo: repo.fullName,
                tags: repo.topics.slice(0, 10),
                links: { repo: repo.htmlUrl },
                lastActivityAt: repo.pushedAt,
                statusChangedAt: new Date(),
            });
            created += 1;
        } else {
            // Refresh metadata without clobbering the user's status/nextAction.
            project.description = project.description || repo.description;
            project.links = { ...project.links, repo: repo.htmlUrl };
            if (repo.pushedAt && (!project.lastActivityAt || repo.pushedAt > project.lastActivityAt)) {
                project.lastActivityAt = repo.pushedAt;
            }
            await project.save();
            updated += 1;
        }

        // Backfill recent commits as activity (dedupe by URL).
        const commits = await listRecentCommits({ fullName: repo.fullName, token });
        for (const c of commits) {
            if (!c.url) continue;
            const exists = await ActivityEvent.findOne({ userId, url: c.url });
            if (exists) continue;
            await ActivityEvent.create({
                userId,
                projectId: project._id,
                source: 'github',
                type: 'push',
                summary: `${repo.name}: ${c.message}`.slice(0, 200),
                url: c.url,
                occurredAt: c.date || new Date(),
            });
            events += 1;
        }
    }

    logger.info({ userId: String(userId), created, updated, events }, 'GitHub import complete');
    return { repos: repos.length, projectsCreated: created, projectsUpdated: updated, activityLogged: events };
}

/**
 * Register a push/PR/issues webhook on each of the user's imported repos,
 * pointing at the deployed callback URL. Requires a token with admin:repo_hook.
 * Idempotent-ish: GitHub 422s a duplicate hook; we treat that as "already set".
 */
async function registerWebhooks({ userId, token, callbackUrl, secret }) {
    if (!token) throw new Error('A GitHub token with admin:repo_hook scope is required');
    if (!callbackUrl) throw new Error('callbackUrl is required (your deployed /hooks/github URL)');

    const projects = await Project.find({ userId, githubRepo: { $ne: '' } }).select('githubRepo name');
    const results = [];
    for (const p of projects) {
        try {
            const res = await fetch(`${API}/repos/${p.githubRepo}/hooks`, {
                method: 'POST',
                headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'web',
                    active: true,
                    events: ['push', 'pull_request', 'issues'],
                    config: { url: callbackUrl, content_type: 'json', secret: secret || undefined, insecure_ssl: '0' },
                }),
            });
            if (res.ok) results.push({ repo: p.githubRepo, status: 'registered' });
            else if (res.status === 422) results.push({ repo: p.githubRepo, status: 'already-exists' });
            else results.push({ repo: p.githubRepo, status: `error-${res.status}` });
        } catch (err) {
            results.push({ repo: p.githubRepo, status: `error: ${err.message}` });
        }
    }
    return results;
}

module.exports = { listRepos, listRecentCommits, importUserRepos, registerWebhooks };
