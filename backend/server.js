// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');

const { env } = require('./config/env'); // validates env at boot (fail-fast)
const { logger } = require('./config/logger');
const {
    securityHeaders,
    corsMiddleware,
    globalRateLimiter,
    authRateLimiter,
} = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Netlify/CDN for rate limiting

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(securityHeaders);
app.use(corsMiddleware);
// rawBody is kept for HMAC verification of inbound webhooks (GitHub).
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

// ── Health check (no DB dependency; reports current status) ──────────────────────
app.get(['/health', '/api/health'], (_req, res) => {
    res.json({
        status: 'ok',
        server: 'Personal Backend',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        mongoState: mongoose.connection.readyState,
    });
});

// ── MongoDB connection (cached across serverless invocations) ──────────────────
let isConnected = false;
const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        const conn = await mongoose.connect(env.MONGODB_URI, {
            connectTimeoutMS: 5000,
            socketTimeoutMS: 10000,
            serverSelectionTimeoutMS: 5000,
        });
        isConnected = true;
        logger.info({ host: conn.connection.host }, 'MongoDB connected');
    } catch (error) {
        logger.error({ err: error.message }, 'MongoDB connection error');
        throw error;
    }
};

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Database connection failed. Verify MONGODB_URI and Atlas IP allow-list.',
            },
        });
    }
});

// ── Routes ─────────────────────────────────────────────────────────────────────
// Canonical surface is /api/v1/*. The extra aliases preserve compatibility with
// the current Netlify function basePath and existing clients; collapse later.
const apiPrefix = '/api/v1';
const routes = {
    auth: require('./routes/auth'),
    personal: require('./routes/personal'),
    admin: require('./routes/admin'),
    chat: require('./routes/chat'),
    notifications: require('./routes/notification'),
    agent: require('./routes/agent'),
    staff: require('./routes/staff'),
    portfolio: require('./routes/portfolio'),
    ingest: require('./routes/ingest'),
};
const { githubWebhook } = require('./controllers/ingest');

app.use([`${apiPrefix}/auth`, '/v1/auth', '/api/auth', '/auth'], authRateLimiter, routes.auth);
app.use([`${apiPrefix}/personal`, '/v1/personal', '/api/personal', '/personal'], globalRateLimiter, protect, routes.personal);
app.use([`${apiPrefix}/admin`, '/v1/admin', '/api/admin', '/admin'], globalRateLimiter, routes.admin);
app.use([`${apiPrefix}/chat`, '/v1/chat', '/api/chat', '/chat'], globalRateLimiter, routes.chat);
app.use([`${apiPrefix}/notifications`, '/v1/notifications', '/api/notifications', '/notifications'], globalRateLimiter, routes.notifications);
app.use([`${apiPrefix}/agent`, '/v1/agent', '/api/agent', '/agent'], globalRateLimiter, protect, routes.agent);
app.use([`${apiPrefix}/staff`, '/v1/staff', '/api/staff', '/staff'], globalRateLimiter, protect, routes.staff);
app.use([`${apiPrefix}/portfolio`, '/v1/portfolio', '/api/portfolio', '/portfolio'], globalRateLimiter, protect, routes.portfolio);
app.use([`${apiPrefix}/ingest`, '/v1/ingest', '/api/ingest', '/ingest'], globalRateLimiter, protect, routes.ingest);
// GitHub webhook: no auth (GitHub can't log in) — HMAC-verified when GITHUB_WEBHOOK_SECRET is set.
app.post([`${apiPrefix}/hooks/github`, '/api/hooks/github', '/hooks/github'], globalRateLimiter, githubWebhook);
// Machine cron: no user JWT — verified via X-Service-Token inside the controller.
const { runCron } = require('./controllers/cron');
app.post([`${apiPrefix}/cron/run`, '/api/cron/run', '/cron/run'], globalRateLimiter, runCron);

// ── Error handling (must be last) ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// Listen when run directly (`node server.js`, incl. inside Docker / on a server).
// Under serverless the app is only `require`d and wrapped, so this stays off.
if (require.main === module) {
    app.listen(env.PORT, () => logger.info(`Backend running on http://localhost:${env.PORT} [${env.NODE_ENV}]`));
    // Staff-agent scheduler (morning brief, ghostwriter, Friday review, RSS poll).
    // Long-running tier only — serverless invocations never reach this branch.
    if (env.ENABLE_SCHEDULER) {
        connectDB().then(() => require('./services/scheduler').start())
            .catch((err) => logger.error({ err: err.message }, 'Scheduler not started (DB unavailable)'));
    }
}

module.exports = app;
