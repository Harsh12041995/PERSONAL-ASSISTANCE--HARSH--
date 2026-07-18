// backend/middleware/security.js
// Composable security middleware: helmet headers, an explicit CORS allow-list,
// and a tiered rate limiter. Applied centrally in server.js.

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { logger } = require('../config/logger');
const { AppError } = require('../utils/AppError');

/** Strict security headers. CSP is relaxed only as needed by the SPA host. */
const securityHeaders = helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * CORS with an explicit allow-list. In development, when no list is configured,
 * we allow all origins for convenience. In production an empty list means
 * same-origin only (browser requests from other origins are rejected).
 */
const corsMiddleware = cors({
    origin(origin, callback) {
        // Non-browser clients (curl, server-to-server) send no Origin header.
        if (!origin) return callback(null, true);
        if (env.isDev && env.corsOrigins.length === 0) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        logger.warn({ origin }, 'Blocked by CORS allow-list');
        return callback(new AppError('Origin not allowed by CORS', 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

/** Global limiter — protects the whole API surface from abuse. */
const globalRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } },
});

/** Stricter limiter for auth endpoints to blunt credential-stuffing. */
const authRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: Math.max(10, Math.floor(env.RATE_LIMIT_MAX / 15)),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later.' } },
});

module.exports = { securityHeaders, corsMiddleware, globalRateLimiter, authRateLimiter };
