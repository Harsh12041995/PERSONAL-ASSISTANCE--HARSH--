import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        // Default to not hitting a real DB; integration tests opt in explicitly.
        testTimeout: 15000,
    },
});
