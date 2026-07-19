// backend/services/scheduler.js
// Zero-dependency job scheduler for the long-running (Docker) tier.
// Checks the clock once a minute and fires jobs whose HH:MM (or interval)
// matches. Never enabled under serverless — see server.js guard.
//
// Jobs run for every user in the system (this is a personal portal; the user
// count is tiny). Each job is wrapped so one user's failure can't stop the rest.

const { logger: log } = require('../config/logger');
const User = require('../models/User');
const { generateMorningBrief } = require('./staff/chiefOfStaff');
const { runForNewPosts } = require('./staff/ghostwriter');
const { runPortfolioReview } = require('./staff/analyst');
const { runAllEnabled } = require('./ingest/rss');
const { generateFollowUpReminders } = require('./followUps');

const MINUTE_MS = 60 * 1000;

async function forEachUser(jobName, fn) {
    const users = await User.find({}).select('_id').limit(50).lean();
    for (const u of users) {
        try {
            await fn(u._id);
        } catch (err) {
            log.warn({ job: jobName, userId: String(u._id), err: err.message }, 'Scheduled job failed for user');
        }
    }
}

// Schedule table. `at` = "HH:MM" server time; `dow` = 0-6 (Sun-Sat) optional;
// `everyMinutes` = interval jobs.
const JOBS = [
    {
        name: 'morning-brief',
        at: '07:00',
        run: () => forEachUser('morning-brief', (id) => generateMorningBrief(id)),
    },
    {
        name: 'ghostwriter-nightly',
        at: '02:00',
        run: () => forEachUser('ghostwriter-nightly', (id) => runForNewPosts(id)),
    },
    {
        name: 'portfolio-review',
        at: '16:00',
        dow: 5, // Friday
        run: () => forEachUser('portfolio-review', (id) => runPortfolioReview(id)),
    },
    {
        name: 'rss-poll',
        everyMinutes: 60,
        run: () => runAllEnabled(),
    },
    {
        name: 'contact-followups',
        at: '09:00',
        run: () => forEachUser('contact-followups', (id) => generateFollowUpReminders(id)),
    },
];

let timer = null;
let lastTick = null;

function start() {
    if (timer) return;
    log.info({ jobs: JOBS.map((j) => j.name) }, 'Scheduler started');
    timer = setInterval(async () => {
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const minuteOfDay = now.getHours() * 60 + now.getMinutes();

        for (const job of JOBS) {
            const timeMatch = job.at && job.at === hhmm && (job.dow === undefined || job.dow === now.getDay());
            const intervalMatch = job.everyMinutes && minuteOfDay % job.everyMinutes === 0;
            if (!timeMatch && !intervalMatch) continue;
            // Guard against double-fire within the same minute.
            const tickKey = `${job.name}@${now.toISOString().slice(0, 16)}`;
            if (lastTick === tickKey) continue;
            lastTick = tickKey;

            log.info({ job: job.name }, 'Scheduled job firing');
            try {
                await job.run();
            } catch (err) {
                log.error({ job: job.name, err: err.message }, 'Scheduled job crashed');
            }
        }
    }, MINUTE_MS);
    timer.unref?.(); // never keep the process alive just for the scheduler
}

function stop() {
    if (timer) clearInterval(timer);
    timer = null;
}

module.exports = { start, stop, JOBS };
