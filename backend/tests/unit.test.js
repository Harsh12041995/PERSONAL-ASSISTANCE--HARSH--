// backend/tests/unit.test.js
import { describe, it, expect } from 'vitest';
import { AppError } from '../utils/AppError.js';

describe('AppError', () => {
    it('defaults to a 500 with an INTERNAL_ERROR code', () => {
        const e = new AppError('boom');
        expect(e.statusCode).toBe(500);
        expect(e.code).toBe('INTERNAL_ERROR');
        expect(e.isOperational).toBe(true);
    });

    it('factory helpers set the right status and code', () => {
        expect(AppError.notFound().statusCode).toBe(404);
        expect(AppError.unauthorized().statusCode).toBe(401);
        expect(AppError.badRequest('bad', [{ path: 'x' }]).details).toHaveLength(1);
    });
});
