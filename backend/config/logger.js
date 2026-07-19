// backend/config/logger.js
// Structured logging via pino. Replaces ad-hoc console.log calls so logs are
// machine-parseable in production and pretty in development.

const pino = require('pino');
const { env } = require('./env');

const logger = pino({
    level: env.LOG_LEVEL,
    // Pretty-print only in local dev; JSON everywhere else (and in serverless).
    transport: env.isDev
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
    redact: {
        // Never leak credentials into logs.
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
        censor: '[redacted]',
    },
    base: { service: 'personal-backend' },
});

module.exports = { logger };
