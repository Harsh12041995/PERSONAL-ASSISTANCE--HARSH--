#!/usr/bin/env bash
# infra/setup-ollama.sh
# Pull the models the agent runtime needs. Idempotent — re-run anytime.
set -euo pipefail

OLLAMA_HOST="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
CHAT_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
EMBED_MODEL="${OLLAMA_EMBED_MODEL:-nomic-embed-text}"

pull() {
  local model="$1"
  echo "→ Pulling ${model} ..."
  curl -fsS "${OLLAMA_HOST}/api/pull" -d "{\"name\":\"${model}\"}" \
    | tail -n 1 || { echo "Failed to pull ${model}"; exit 1; }
  echo "✓ ${model} ready"
}

echo "Using Ollama at ${OLLAMA_HOST}"
pull "${CHAT_MODEL}"
pull "${EMBED_MODEL}"
echo "All models pulled. Chat=${CHAT_MODEL} Embed=${EMBED_MODEL}"
