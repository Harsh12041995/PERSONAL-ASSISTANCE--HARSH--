// backend/services/agent/tools/index.js
// Builds the default tool registry. Add new tools here as later phases land.

const { ToolRegistry } = require('./registry');

function buildRegistry() {
    const registry = new ToolRegistry();
    registry
        .register(require('./createTask'))
        .register(require('./logExpense'))
        .register(require('./addCapture'))
        .register(require('./searchContext'));
    return registry;
}

// Shared singleton for the running app; tests can build their own.
const defaultRegistry = buildRegistry();

module.exports = { buildRegistry, defaultRegistry };
