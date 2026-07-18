// backend/middleware/errorHandler.js
// Centralized error handling: an async wrapper, a 404 handler, and a single
// terminal error middleware. Controllers no longer need try/catch boilerplate.

const { ZodError } = require('zod');
const mongoose = require('mongoose');
const { AppError } = require('../utils/AppError');
const { logger } = require('../config/logger');
const { env } = require('../config/env');

/**
 * Wrap an async route handler so thrown/rejected errors reach the error
 * middleware instead of crashing the process.
 * @param {Function} fn
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/** 404 for unmatched routes. */
const notFound = (req, _res, next) =>
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

/** Normalize known error shapes into an AppError-like response. */
function normalize(err) {
    if (err instanceof AppError) return err;

    if (err instanceof ZodError) {
        return new AppError('Validation failed', 422, {
            code: 'VALIDATION_ERROR',
            details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
            cause: err,
        });
    }
    if (err instanceof mongoose.Error.ValidationError) {
        return new AppError('Validation failed', 422, {
            code: 'VALIDATION_ERROR',
            details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
            cause: err,
        });
    }
    if (err instanceof mongoose.Error.CastError) {
        return new AppError(`Invalid value for ${err.path}`, 400, { code: 'BAD_REQUEST', cause: err });
    }
    if (err?.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return new AppError(`Duplicate value for ${field}`, 409, { code: 'CONFLICT', cause: err });
    }
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
        return new AppError('Not authorized', 401, { cause: err });
    }
    return new AppError(env.isProd ? 'Something went wrong' : err.message, 500, { cause: err });
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
    const appErr = normalize(err);

    // Log full detail server-side; only operational/4xx are "expected".
    const logFn = appErr.statusCode >= 500 ? logger.error : logger.warn;
    logFn.call(logger, {
        err: { message: err.message, stack: err.stack, code: appErr.code },
        method: req.method,
        url: req.originalUrl,
    }, appErr.message);

    res.status(appErr.statusCode).json({
        success: false,
        error: {
            code: appErr.code,
            message: appErr.message,
            ...(appErr.details ? { details: appErr.details } : {}),
        },
    });
};

module.exports = { asyncHandler, notFound, errorHandler };
