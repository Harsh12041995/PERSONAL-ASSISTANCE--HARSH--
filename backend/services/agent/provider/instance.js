// backend/services/agent/provider/instance.js
// Shared provider singleton. Lives in its own module so both the orchestrator
// (index.js) and the RAG layer can import it without creating a require cycle.

const { OllamaProvider } = require('./ollama');

const provider = new OllamaProvider();

module.exports = { provider };
