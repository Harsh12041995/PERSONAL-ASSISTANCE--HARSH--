// backend/tests/health.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('GET /health', () => {
    it('returns ok without requiring a database connection', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('mongodb');
    });
});

describe('unknown routes', () => {
    it('returns a structured 404', async () => {
        const res = await request(app).get('/api/v1/this-does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
});
