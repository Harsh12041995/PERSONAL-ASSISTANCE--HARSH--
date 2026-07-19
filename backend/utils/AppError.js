// backend/utils/AppError.js
// Typed, operational error class. Throw these from services/controllers to get
// consistent HTTP status codes and a clean client-facing message, while keeping
// stack traces for logging.

class AppError extends Error {
    /**
     * @param {string} message client-safe message
     * @param {number} statusCode HTTP status
     * @param {object} [options]
     * @param {string} [options.code] machine-readable error code
     * @param {unknown} [options.details] safe-to-expose validation details
     * @param {Error}  [options.cause] underlying error for logging
     */
    constructor(message, statusCode = 500, options = {}) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = options.code || httpCodeName(statusCode);
        this.details = options.details;
        this.isOperational = true;
        Error.captureStackTrace?.(this, AppError);
    }
}

function httpCodeName(status) {
    const map = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE_ENTITY',
        429: 'RATE_LIMITED',
        500: 'INTERNAL_ERROR',
        503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] || 'ERROR';
}

// Convenience factories
AppError.badRequest = (m, details) => new AppError(m, 400, { code: 'BAD_REQUEST', details });
AppError.unauthorized = (m = 'Not authorized') => new AppError(m, 401);
AppError.forbidden = (m = 'Forbidden') => new AppError(m, 403);
AppError.notFound = (m = 'Resource not found') => new AppError(m, 404);
AppError.conflict = (m) => new AppError(m, 409);

module.exports = { AppError };
