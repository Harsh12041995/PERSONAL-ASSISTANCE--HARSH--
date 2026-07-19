// backend/tests/setup.js
// Provide a valid, isolated environment for the config validator so importing
// the app never tries to read real secrets or exit the process during tests.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-please-change';
process.env.LOG_LEVEL = 'silent';
