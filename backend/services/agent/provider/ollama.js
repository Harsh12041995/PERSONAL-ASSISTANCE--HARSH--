// backend/services/agent/provider/ollama.js
// Local-first LLM provider backed by Ollama's native /api/chat tool-calling API.
// Plain fetch — no framework dependency. Implements a small, stable interface
// (chat + embed) so a cloud adapter (Claude/OpenAI) can be swapped in later.

const { env } = require('../../../config/env');
const { logger } = require('../../../config/logger');
const { AppError } = require('../../../utils/AppError');

/**
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'|'tool'} role
 * @property {string} [content]
 * @property {Array<{function:{name:string,arguments:object}}>} [tool_calls]
 * @property {string} [tool_name]
 */

class OllamaProvider {
    /**
     * @param {object} [opts]
     * @param {string} [opts.baseUrl]
     * @param {string} [opts.model]
     * @param {string} [opts.embedModel]
     */
    constructor(opts = {}) {
        this.baseUrl = (opts.baseUrl || env.OLLAMA_BASE_URL).replace(/\/$/, '');
        this.model = opts.model || env.OLLAMA_MODEL;
        this.embedModel = opts.embedModel || env.OLLAMA_EMBED_MODEL;
    }

    /**
     * One non-streaming chat turn. Returns the assistant message, which may
     * contain `tool_calls` instead of (or alongside) content.
     * @param {object} args
     * @param {ChatMessage[]} args.messages
     * @param {Array<object>} [args.tools] OpenAI-style function tool specs
     * @param {object} [args.options] Ollama options (temperature, etc.)
     * @param {AbortSignal} [args.signal]
     * @returns {Promise<ChatMessage>}
     */
    async chat({ messages, tools, options, signal }) {
        const body = {
            model: this.model,
            messages,
            stream: false,
            options: { temperature: 0.4, ...options },
        };
        if (tools && tools.length) body.tools = tools;

        const data = await this.#post('/api/chat', body, signal);
        if (!data || !data.message) {
            throw new AppError('Empty response from Ollama', 502, { code: 'PROVIDER_ERROR' });
        }
        return data.message;
    }

    /**
     * Stream a chat turn. Calls onDelta(text) for each content chunk and
     * resolves with the fully assembled assistant message.
     * @param {object} args
     * @param {ChatMessage[]} args.messages
     * @param {Array<object>} [args.tools]
     * @param {(delta:string)=>void} args.onDelta
     * @param {object} [args.options]
     * @param {AbortSignal} [args.signal]
     * @returns {Promise<ChatMessage>}
     */
    async streamChat({ messages, tools, onDelta, options, signal }) {
        const body = {
            model: this.model,
            messages,
            stream: true,
            options: { temperature: 0.4, ...options },
        };
        if (tools && tools.length) body.tools = tools;

        const res = await this.#fetch('/api/chat', body, signal);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const assembled = { role: 'assistant', content: '', tool_calls: undefined };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (!line) continue;
                let json;
                try { json = JSON.parse(line); } catch { continue; }
                const msg = json.message;
                if (msg?.content) {
                    assembled.content += msg.content;
                    onDelta?.(msg.content);
                }
                if (msg?.tool_calls?.length) {
                    assembled.tool_calls = (assembled.tool_calls || []).concat(msg.tool_calls);
                }
            }
        }
        if (!assembled.tool_calls) delete assembled.tool_calls;
        return assembled;
    }

    /**
     * Embed a single text into a vector (for RAG / memory in Phase 2).
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async embed(text) {
        const data = await this.#post('/api/embeddings', { model: this.embedModel, prompt: text });
        if (!Array.isArray(data?.embedding)) {
            throw new AppError('Embedding failed', 502, { code: 'PROVIDER_ERROR' });
        }
        return data.embedding;
    }

    /** Liveness probe used by /agent/health. */
    async ping() {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`);
            return res.ok;
        } catch {
            return false;
        }
    }

    // ── internals ────────────────────────────────────────────────────────────
    async #fetch(path, body, signal) {
        let res;
        try {
            res = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal,
            });
        } catch (err) {
            logger.error({ err: err.message, path }, 'Ollama request failed');
            throw new AppError(
                'Local AI engine (Ollama) is unreachable. Is it running on ' + this.baseUrl + '?',
                503,
                { code: 'PROVIDER_UNAVAILABLE', cause: err },
            );
        }
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new AppError(`Ollama error ${res.status}: ${txt.slice(0, 200)}`, 502, { code: 'PROVIDER_ERROR' });
        }
        return res;
    }

    async #post(path, body, signal) {
        const res = await this.#fetch(path, body, signal);
        return res.json();
    }
}

module.exports = { OllamaProvider };
