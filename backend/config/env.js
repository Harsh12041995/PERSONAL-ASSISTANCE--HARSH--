// backend/config/env.js
// Single source of truth for environment configuration.
// Validates and coerces process.env at boot so the app fails fast and loud
// instead of surfacing `undefined` errors deep in a request handler.

const { z } = require('zod');

const EnvSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'staging', 'production'])
        .default('development'),
    PORT: z.coerce.number().int().positive().default(5001),

    // Data
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    // Auth
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // Security
    // Comma-separated allow-list of browser origins. Empty => same-origin only.
    CORS_ORIGINS: z.string().default(''),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

    // Logging
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
        .default('info'),

    // Agent runtime (Phase 1+ — optional until the agent ships)
    OLLAMA_BASE_URL: z.string().default('http://127.0.0.1:11434'),
    OLLAMA_MODEL: z.string().default('llama3.1:8b'),
    OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),

    // RAG vector store. 'local' = app-side cosine over a Mongo collection
    // (works with any MongoDB + Compass). 'atlas' = native $vectorSearch index.
    VECTOR_BACKEND: z.enum(['local', 'atlas']).default('local'),
    VECTOR_INDEX: z.string().default('vector_index'), // Atlas Search index name
    EMBED_DIM: z.coerce.number().int().positive().default(768), // nomic-embed-text

    // Staff agents & ingestion (CEO OS layer)
    // Scheduler only makes sense on the long-running (Docker) tier.
    ENABLE_SCHEDULER: z
        .string()
        .default('false')
        .transform((v) => v === 'true' || v === '1'),
    // Optional: verify GitHub webhook payloads (recommended in production).
    GITHUB_WEBHOOK_SECRET: z.string().default(''),
    // Portfolio importer: token unlocks private repos + higher rate limits.
    GITHUB_TOKEN: z.string().default(''),
    GITHUB_USER: z.string().default(''),
    // Public base URL of the deployed backend, used to register webhooks
    // (e.g. https://api.yourdomain.com). No trailing slash.
    PUBLIC_BASE_URL: z.string().default(''),
    // Shared secret for machine-to-machine cron calls (X-Service-Token).
    // Set this on serverless deploys where the in-process scheduler can't run.
    SERVICE_TOKEN: z.string().default(''),
});

/**
 * Parse and validate the environment exactly once.
 * @returns {z.infer<typeof EnvSchema>}
 */
function loadEnv() {
    const parsed = EnvSchema.safeParse(process.env);

    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('\n');
        // eslint-disable-next-line no-console
        console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
        // Never boot with a broken/insecure config.
        process.exit(1);
    }

    const env = parsed.data;
    return {
        ...env,
        isProd: env.NODE_ENV === 'production',
        isDev: env.NODE_ENV === 'development',
        isTest: env.NODE_ENV === 'test',
        corsOrigins: env.CORS_ORIGINS
            ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
    };
}

const env = loadEnv();

module.exports = { env, EnvSchema };
