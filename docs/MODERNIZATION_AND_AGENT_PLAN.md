# Personal Command Center → "Jarvis" — Modernization & Agentic Platform Plan

> **Version:** 1.0 · **Date:** 6 June 2026 · **Status:** 🟡 Awaiting approval
> **Author:** Staff Engineering review
> **Engine decision:** Local-first (Ollama) · Privacy-first · Cloud optional

---

## 1. Executive Summary

The project today is a competent **single-user life OS** (React 18 + Vite 6 + TS + Tailwind 4 frontend; Express 5 + Mongoose 9 backend on Netlify serverless) with ~15 feature modules. It is well past prototype, but two things hold it back from being the "personal Jarvis" you want to show data scientists, founders, and senior engineers:

1. **The "AI" is not an agent.** It is a single-shot `prompt → text` call against `gemini-1.5-flash` / `gpt-3.5-turbo` / Ollama. It has no tool-use, no agent loop, no memory, no retrieval, no streaming, and — critically — **it cannot act on your data**. It can talk about your tasks but cannot create one.
2. **Production-grade engineering hygiene is missing.** No tests, no CI, no validation layer, no rate limiting, wide-open CORS, API keys stored in the database, ~12 route-path aliases as a workaround, and several 400–560-line "god" components.

This plan defines a target architecture and a phased, fully-enumerated task list to turn this into a **local-first, multi-agent, RAG-grounded, tool-using personal assistant** with a hardened, tested, observable codebase — without throwing away the existing modules.

---

## 2. Current-State Assessment

### 2.1 What's good (keep)
- Modern frontend baseline: React 18, Vite 6, TS 5.7, Tailwind 4, TanStack Query + Table, react-hook-form + yup.
- Clear domain modeling: 25+ Mongoose models covering the real life-OS surface (Task, Finance, Budget, Goal, Health, Knowledge, Capture, Career, Social, Calendar, Chat).
- Documentation discipline already exists (`docs/` with BRD, module docs, product flows).
- Sensible separation: `controllers / routes / models / middleware / services / utils`.

### 2.2 Findings (ranked by severity)

| # | Severity | Area | Finding | Impact |
|---|---|---|---|---|
| F1 | 🔴 Critical | AI | No agent loop / tool-calling. AI cannot perform actions or read structured data. | Blocks the entire "Jarvis" goal. |
| F2 | 🔴 Critical | Security | CORS `*`, no rate limiting, no helmet, no request validation, secrets (API keys) stored plaintext in Mongo `UserSettings`. | Exploitable; not showcase-safe. |
| F3 | 🔴 Critical | Quality | Zero automated tests, no CI/CD pipeline. | No regression safety; refactors are risky. |
| F4 | 🟠 High | AI | Outdated models (`gemini-1.5-flash`, `gpt-3.5-turbo`); no embeddings; no RAG; no memory. | Weak, context-blind answers. |
| F5 | 🟠 High | Backend | `personal.js` controller = 646 lines, mixed concerns; no service/repository layer; no centralized error handler. | Hard to maintain/extend. |
| F6 | 🟠 High | Architecture | 12 route-path aliases (`/api/v1`, `/v1`, `/api`, `/`) papering over a routing/deploy mismatch. | Fragile; ambiguous contract. |
| F7 | 🟠 High | Data | Career & Social modules persist to `localStorage`, not Mongo (BRD admits this). | Data loss; inconsistent. |
| F8 | 🟡 Medium | Frontend | 400–562-line page components (`WorkflowManagerPage`, `CareerPage`, `SettingsPage`, `Home`) mix data-fetching, state, and UI. | Low reuse, hard to test. |
| F9 | 🟡 Medium | Frontend | `authService.ts` = 970 lines; logic that belongs in hooks/services is centralized into one file. | Coupling. |
| F10 | 🟡 Medium | Config | Env files duplicated 5×; no schema validation of env at boot. | Drift, runtime surprises. |
| F11 | 🟡 Medium | Types | Frontend/backend share no type contract; types hand-duplicated in `src/types`. | Contract drift. |
| F12 | 🟢 Low | DX | No monorepo workspace tooling; backend and frontend deps diverge (Mongoose 9.2 vs 9.3). | Minor friction. |

---

## 3. Target Architecture

### 3.1 Guiding principles
- **Local-first, private by default.** The agent runs on **Ollama** on your machine. No personal data leaves the box unless you explicitly enable a cloud connector.
- **The agent acts, not just answers.** Every module exposes typed *tools*; the agent reads and writes your real data through them.
- **Grounded, not hallucinated.** A retrieval (RAG) layer + structured tool calls ground every response in your actual records.
- **Composable agents.** A supervisor orchestrator delegates to specialist agents (Finance, Tasks, Health, Career, Knowledge, Researcher) — and you can define new ones from the UI.
- **Pluggable.** External capabilities connect via the **Model Context Protocol (MCP)**, so new data sources/tools snap in without core changes.
- **Provably correct.** Tools are validated (Zod), tested, and traced; agent behavior is covered by evals.

### 3.2 System diagram (logical)

```
┌──────────────────────────────────────────────────────────────────┐
│  React SPA (Vite)                                                  │
│   • Agent chat (SSE streaming, tool-call timeline, citations)      │
│   • Agent Builder UI (define agents, pick tools, system prompts)   │
│   • Existing modules (Tasks/Finance/Health/...)                    │
└───────────────▲───────────────────────────────┬───────────────────┘
                │ SSE / REST (Zod-typed)         │
┌───────────────┴───────────────────────────────▼───────────────────┐
│  Node API (Express 5)                                              │
│  ┌──────────────┐  ┌───────────────────────────────────────────┐  │
│  │ Module CRUD  │  │  AGENT RUNTIME                              │  │
│  │ services     │  │  • Orchestrator (supervisor)               │  │
│  │ (repository) │  │  • Specialist agents                       │  │
│  └──────┬───────┘  │  • Agent loop (plan→tool→observe→reflect)   │  │
│         │          │  • Tool Registry (Zod-validated)           │  │
│         │          │  • Memory (short-term + long-term)         │  │
│         │          │  • RAG retriever                           │  │
│         │          │  • MCP client (external plugins)           │  │
│         │          └───────┬───────────────┬───────────────┬────┘  │
└─────────┼──────────────────┼───────────────┼───────────────┼───────┘
          ▼                  ▼               ▼               ▼
   ┌────────────┐   ┌────────────────┐ ┌──────────┐  ┌──────────────┐
   │  MongoDB   │   │  Ollama         │ │ Qdrant   │  │ MCP servers  │
   │ (records)  │   │  LLM + embed    │ │ (vectors)│  │ (plugins)    │
   └────────────┘   └────────────────┘ └──────────┘  └──────────────┘
```

### 3.3 Agent runtime components

**LLM provider — Ollama (local-first).**
- Reasoning/tool-calling model: `llama3.1:8b` or `qwen2.5:7b-instruct` (both support native tool-calling). `qwen2.5:14b` if your hardware allows for sharper reasoning.
- Embeddings model: `nomic-embed-text` (or `bge-m3` for multilingual incl. Hindi).
- A thin **provider interface** keeps cloud optional: `LLMProvider { chat(), embed() }` with an Ollama implementation now and Claude/OpenAI adapters behind a feature flag later.

**Agent runtime — Vercel AI SDK (`ai` + `ollama-ai-provider`).**
- Gives streaming, native tool-calling, and structured output (Zod) with a clean TS API — avoids the weight of LangChain while staying model-agnostic.
- The **agent loop** = `generateText`/`streamText` with `tools` + `maxSteps`, wrapped in our orchestration policy (plan → call tools → observe → reflect → answer).

**Tool Registry.**
- Each tool = `{ name, description, parameters: ZodSchema, execute(args, ctx) }`.
- `ctx` carries `userId`, auth scope, request-scoped DB handles, and a trace span.
- Tools are the *only* way the agent touches data — uniform validation, authorization, and audit logging in one place.

**Memory.**
- *Short-term:* conversation buffer (last N turns) persisted in `ChatMessage` (already exists).
- *Long-term:* salient facts + summaries embedded into Qdrant (`memory` collection), retrieved by relevance — this is what makes it feel like it "knows you."
- *Structured:* the live source of truth is always Mongo, queried via tools.

**RAG retriever.**
- Ingestion pipeline embeds Captures, Knowledge notes, Journal entries, Goals, and completed-task history into Qdrant on write (change-stream or post-save hook).
- A `search_personal_context` tool does hybrid retrieval (vector + metadata filter by module/date/userId) and returns cited snippets.

**Multi-agent orchestration.**
- **Supervisor** receives the user goal, decides whether to answer directly or delegate, and routes to specialists as callable "agent-tools."
- **Specialists** (each = scoped system prompt + tool subset): `FinanceAgent`, `TaskAgent`, `HealthAgent`, `CareerAgent`, `KnowledgeAgent`, `ResearchAgent`.
- Pattern: supervisor-with-handoff (specialists exposed to the supervisor as tools), keeping control flow debuggable and traceable.

**Plugin/connector system — MCP.**
- An MCP client lets the agent attach external MCP servers (web search, GitHub, Google, custom company tools) registered per-user. This is the "connect other plugins" capability and a strong showcase point.

**Proactive intelligence.**
- A scheduler (node-cron in a worker process, or external trigger) runs the agent on a cadence: morning briefing, weekly review, anomaly/insight detection (habits↔productivity↔finance correlations), and reminders — written back as Captures/Notifications.

---

## 4. Code-Quality & Modernization Workstream

Runs in parallel with the agent build; Phase 0 is a prerequisite for safe iteration.

**Repository structure (target — pnpm/yarn workspaces monorepo):**
```
/
├─ apps/
│  ├─ web/                 # React SPA (current src/)
│  └─ api/                 # Express API (current backend/)
├─ packages/
│  ├─ shared/              # Zod schemas + shared TS types (single source of truth)
│  ├─ agent-core/          # provider, agent loop, tool registry, memory, RAG
│  ├─ tools/               # tool implementations (one per module)
│  └─ agents/              # agent definitions + orchestrator
├─ docs/
└─ infra/                  # docker-compose (Ollama, Qdrant, Mongo), CI
```

**Backend hardening:**
- Introduce a **service/repository layer**; controllers become thin (parse → call service → format). Break up the 646-line `personal.js`.
- **Validation** with Zod middleware on every route; reject malformed input at the edge.
- **Security:** `helmet`, strict CORS allow-list, `express-rate-limit`, JWT refresh + rotation, move API keys/secrets out of Mongo into encrypted env/secret store.
- **Centralized error handler** + typed error classes; structured logging (`pino`) replacing `console.log`.
- **Collapse route aliases** to a single canonical `/api/v1/*`; fix the Netlify redirect at the edge instead of in app code.
- Migrate Career & Social off `localStorage` to Mongo models + tools.

**Frontend modernization:**
- Decompose god-components into container + presentational + hooks; colocate data access in TanStack Query hooks.
- Adopt a typed API client generated from `packages/shared` schemas (no hand-duplicated types).
- Add loading/empty/error states uniformly; route-level code-splitting; error boundaries per feature.
- Rebuild the chat into a streaming agent surface (tool-call timeline, citations, stop/regenerate).

**Testing & CI:**
- Backend: Vitest unit tests for services + tools; supertest for routes; in-memory Mongo.
- Frontend: Vitest + Testing Library for hooks/components; Playwright smoke for critical flows.
- **Agent evals:** a scenario suite asserting the agent picks the right tool and produces grounded output (golden transcripts + tool-call assertions).
- GitHub Actions: lint → typecheck → test → build, on PR; preview deploy.

**Observability:**
- OpenTelemetry traces around the agent loop (span per tool call), token/latency metrics, and a per-conversation trace viewer in the Agent Builder for debugging.

---

## 5. Data Model Additions

| Model / Collection | Store | Purpose |
|---|---|---|
| `AgentDefinition` | Mongo | User-defined agents: name, systemPrompt, model, allowed tool names, temperature. |
| `AgentRun` | Mongo | One agent invocation: input, plan, tool calls, output, tokens, latency, status. |
| `ToolCall` | Mongo | Per-tool audit: name, args, result/error, duration, runId. |
| `MemoryItem` | Qdrant + Mongo meta | Long-term memory: text, embedding, source ref, salience, createdAt. |
| `Embedding` (per module) | Qdrant | Vectorized Captures/Knowledge/Journal/Goals for RAG. |
| `PluginConnection` | Mongo | Registered MCP servers per user: url/cmd, auth, enabled tools. |
| `ScheduledJob` | Mongo | Proactive task definitions: agent, cron, last run, output target. |

---

## 6. Agent API Contract (canonical `/api/v1`)

```
POST /api/v1/agent/chat            # SSE stream: text deltas + tool_call + tool_result + citations + done
GET  /api/v1/agent/runs/:id        # full trace of a run (plan, tool calls, timings)
GET  /api/v1/agents                # list agent definitions
POST /api/v1/agents                # create agent (name, prompt, tools[], model)
PUT  /api/v1/agents/:id            # update
GET  /api/v1/tools                 # registry: tool name, description, JSON schema
POST /api/v1/memory/search         # debug: query long-term memory
GET  /api/v1/plugins               # list MCP connections
POST /api/v1/plugins               # register MCP server
POST /api/v1/schedules             # create proactive job
```

**SSE event shape:**
```jsonc
{ "type": "text",        "delta": "..." }
{ "type": "tool_call",   "name": "create_task", "args": { ... }, "id": "tc_1" }
{ "type": "tool_result", "id": "tc_1", "ok": true, "data": { ... } }
{ "type": "citation",    "source": "capture:6650...", "snippet": "..." }
{ "type": "done",        "runId": "...", "usage": { "tokens": 1234, "ms": 880 } }
```

---

## 7. Phased Roadmap (high-level)

| Phase | Theme | Outcome |
|---|---|---|
| **0** | Foundation & hardening | Monorepo, CI, tests scaffold, security baseline, canonical routes, env validation. |
| **1** | Agent runtime core | Ollama provider, agent loop, streaming chat, tool registry, first 3 tools. |
| **2** | RAG & memory | Qdrant, embedding pipeline, `search_personal_context`, long-term memory. |
| **3** | Full tool suite | CRUD tools across all modules — the agent can *act* everywhere. |
| **4** | Multi-agent teams | Supervisor + specialists, handoff, traceable orchestration. |
| **5** | Plugin system (MCP) | Register external MCP servers; agent uses them safely. |
| **6** | Proactive intelligence | Morning briefing, weekly review, insight detection, reminders. |
| **7** | Frontend agent UX | Streaming chat with tool timeline + citations; Agent Builder UI. |
| **8** | Evals, observability, showcase polish | Eval suite, OTel traces, demo script, README/screens. |

A fully-enumerated task checklist follows in §9. Estimates are rough engineer-days for one focused developer (you + AI pair).

---

## 8. Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| LLM engine | **Ollama** (`llama3.1:8b` / `qwen2.5:7b`) | Local-first, private, no per-token cost, tool-calling capable. |
| Embeddings | **Ollama `nomic-embed-text`** (`bge-m3` for Hindi) | Local, fast, good retrieval quality. |
| Vector DB | **Qdrant** (Docker, local) | Production-grade, metadata filters, runs offline; swappable. |
| Agent runtime | **Vercel AI SDK** + `ollama-ai-provider` | Streaming + tool-calling + Zod structured output; model-agnostic; lean. |
| Validation | **Zod** (shared package) | One schema → API validation + tool params + TS types. |
| Plugins | **MCP** (`@modelcontextprotocol/sdk`) | Standard, future-proof connector protocol. |
| DB | **MongoDB / Mongoose** (keep) | Already modeled; source of truth for records. |
| Testing | **Vitest + Testing Library + Playwright + supertest** | Unified runner, fast, modern. |
| Logging/trace | **pino + OpenTelemetry** | Structured logs + agent-loop tracing. |
| CI | **GitHub Actions** | lint/typecheck/test/build gates. |
| Monorepo | **pnpm workspaces** (or yarn, already in use) | Shared types, single install graph. |
| Infra (dev) | **docker-compose** (Ollama + Qdrant + Mongo) | One-command reproducible local stack. |

> Cloud providers (Claude/OpenAI/Gemini) remain available behind a `LLMProvider` adapter + feature flag, off by default to preserve privacy.

---

## 9. Complete Task List

> Status legend: `[ ]` todo. Tasks are ordered; later phases assume earlier ones. Each task is intentionally small enough to land in one PR.

### Phase 0 — Foundation & Hardening (~5–7 d)
- [ ] **0.1** Convert repo to pnpm/yarn workspaces: `apps/web`, `apps/api`, `packages/*`. Move existing `src/` → `apps/web`, `backend/` → `apps/api`.
- [ ] **0.2** Create `packages/shared` with Zod schemas + inferred TS types for User, Task, Finance, Goal, Health, Capture, etc. Replace hand-written `src/types/*`.
- [ ] **0.3** Add `docker-compose.yml` in `infra/` for Mongo + Qdrant + Ollama; document one-command boot.
- [ ] **0.4** Add env schema validation (`zod` + `dotenv`) at API boot; collapse 5 example env files into one documented `.env.example`.
- [ ] **0.5** Security baseline: `helmet`, CORS allow-list, `express-rate-limit`, body-size limits review.
- [ ] **0.6** Move API keys/secrets out of `UserSettings` (Mongo) into encrypted server-side config; migration script.
- [ ] **0.7** Centralized error handler + typed `AppError` classes; replace `console.log` with `pino` structured logger.
- [ ] **0.8** Collapse route aliases to canonical `/api/v1/*`; fix Netlify redirects at edge (`netlify.toml`).
- [ ] **0.9** Introduce service/repository layer; split `controllers/personal.js` (646 LOC) into per-module services.
- [ ] **0.10** Test scaffolding: Vitest config (api + web), supertest + in-memory Mongo, one smoke test per layer.
- [ ] **0.11** GitHub Actions CI: install → lint → typecheck → test → build on PR.
- [ ] **0.12** Migrate Career & Social modules from `localStorage` to Mongo models + API.

### Phase 1 — Agent Runtime Core (~5–6 d)
- [ ] **1.1** `packages/agent-core`: define `LLMProvider` interface (`chat`, `embed`) + Ollama implementation via `ollama-ai-provider`.
- [ ] **1.2** Pull models in setup script: `llama3.1:8b`, `nomic-embed-text`; document hardware notes.
- [ ] **1.3** Tool Registry: `Tool { name, description, parameters: ZodSchema, execute(args, ctx) }` + register/list APIs.
- [ ] **1.4** Agent loop (plan → tool → observe → reflect → answer) using AI SDK `streamText` + `maxSteps`; request-scoped `ctx` with `userId`/auth.
- [ ] **1.5** `POST /api/v1/agent/chat` SSE endpoint emitting `text`/`tool_call`/`tool_result`/`done` events.
- [ ] **1.6** Persist runs: `AgentRun` + `ToolCall` models; write trace on every invocation.
- [ ] **1.7** First 3 tools end-to-end: `create_task`, `log_expense`, `add_capture` (Zod-validated, audited).
- [ ] **1.8** Unit tests for agent loop (mock provider) + tool execution; eval: "add a task to buy milk" → `create_task` called with correct args.

### Phase 2 — RAG & Memory (~4–5 d)
- [ ] **2.1** Qdrant client wrapper in `agent-core`; collections `personal_context` + `memory` with metadata schema (userId, module, sourceId, date).
- [ ] **2.2** Embedding pipeline: post-save hooks (or change streams) to embed Captures, Knowledge, Journal, Goals on write/update/delete.
- [ ] **2.3** Backfill script to embed existing records.
- [ ] **2.4** `search_personal_context` tool: hybrid vector + metadata-filtered retrieval, returns cited snippets.
- [ ] **2.5** Long-term memory: extract salient facts/summaries per conversation, embed into `memory`, retrieve on new turns.
- [ ] **2.6** Wire citations into SSE (`citation` events) and store source refs on `AgentRun`.
- [ ] **2.7** Eval: ask "what did I spend on food last month?" → retrieval + `query_finance` tool grounded answer.

### Phase 3 — Full Tool Suite (~5–6 d)
- [ ] **3.1** Tasks: `list_tasks`, `update_task`, `complete_task`, `delete_task`.
- [ ] **3.2** Finance: `query_finance`, `set_budget`, `summarize_spending`.
- [ ] **3.3** Goals: `create_goal`, `update_goal_progress`, `list_goals`.
- [ ] **3.4** Health: `log_health`, `get_streak`, `summarize_habits`.
- [ ] **3.5** Calendar: `create_event`, `list_events`, `find_free_time`.
- [ ] **3.6** Knowledge: `save_note`, `search_notes`.
- [ ] **3.7** Career: `add_job`, `compare_job_to_skills`, `parse_cv` (port existing logic into tool form).
- [ ] **3.8** Cross-cutting authorization + audit assertions; per-tool unit tests; expand eval suite to cover each tool.

### Phase 4 — Multi-Agent Teams (~4–5 d)
- [ ] **4.1** `packages/agents`: define specialist agents (system prompt + scoped tool subset): Finance, Task, Health, Career, Knowledge, Research.
- [ ] **4.2** Supervisor/orchestrator that exposes specialists as callable agent-tools (handoff pattern).
- [ ] **4.3** Routing policy + guardrails (max delegation depth, loop/cost limits).
- [ ] **4.4** `AgentDefinition` model + CRUD APIs so agents are data-driven.
- [ ] **4.5** Trace multi-agent runs (parent/child spans); eval: a goal requiring 2+ specialists handed off correctly.

### Phase 5 — Plugin System / MCP (~3–4 d)
- [ ] **5.1** MCP client in `agent-core` (`@modelcontextprotocol/sdk`); `PluginConnection` model.
- [ ] **5.2** `GET/POST /api/v1/plugins` to register/enable external MCP servers per user.
- [ ] **5.3** Surface MCP tools into the registry with namespacing + per-tool enable/disable.
- [ ] **5.4** Sandbox/permission prompts before an external tool acts; audit all external calls.
- [ ] **5.5** Demo connector (e.g., local web-search MCP) wired and tested.

### Phase 6 — Proactive Intelligence (~3–4 d)
- [ ] **6.1** `ScheduledJob` model + scheduler (node-cron worker / external trigger).
- [ ] **6.2** Morning briefing agent run → writes a Capture/Notification (top priorities, today's events, streaks).
- [ ] **6.3** Weekly review agent (wins, misses, trends) → Knowledge note.
- [ ] **6.4** Insight detection: habit↔productivity↔finance correlations surfaced as notifications.
- [ ] **6.5** Reminder rules from tasks/goals with due dates.

### Phase 7 — Frontend Agent UX (~5–6 d)
- [ ] **7.1** Rebuild chat as streaming surface: token streaming, stop/regenerate, markdown + code rendering.
- [ ] **7.2** Tool-call timeline UI (what the agent did, args, results) + citation chips linking to source records.
- [ ] **7.3** Agent Builder page: create/edit agents, pick tools, set model/temperature, test in a sandbox.
- [ ] **7.4** Plugin manager UI (register/enable MCP servers, view permissions).
- [ ] **7.5** Run/trace viewer for debugging; loading/empty/error states throughout.
- [ ] **7.6** Decompose god-components (`WorkflowManagerPage`, `CareerPage`, `SettingsPage`, `Home`) into container + presentational + hooks.

### Phase 8 — Evals, Observability & Showcase (~3–4 d)
- [ ] **8.1** Eval harness: scenario suite (golden transcripts + tool-call assertions) run in CI.
- [ ] **8.2** OpenTelemetry tracing across agent loop; latency/token dashboards.
- [ ] **8.3** Playwright E2E for top flows (capture → agent acts → record appears).
- [ ] **8.4** README rewrite + architecture diagram + 90-second demo script for showcasing.
- [ ] **8.5** Performance pass (streaming TTFB, retrieval latency, bundle size) + a11y audit.

---

## 10. Showcase Highlights (for your audience)

- **"It does things."** Live demo: speak "log ₹400 lunch and remind me to call Rohan tomorrow" → two tools fire, two records appear, a reminder is scheduled. Compelling to founders and PMs.
- **Local-first & private.** Runs entirely on Ollama + Qdrant on your machine — a strong differentiator for the data-scientist/CTO crowd who care about data governance.
- **Multi-agent + traceable.** The run/trace viewer showing supervisor → specialist handoffs and tool calls is exactly the kind of internals senior engineers respect.
- **Extensible via MCP.** "Plug in any tool" demonstrates architecture maturity, not just a chatbot.
- **Grounded answers with citations.** Every claim links back to your real records — no hallucination theater.

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Local model tool-calling reliability on smaller models | Use `qwen2.5`/`llama3.1` (strong tool-calling); constrain with strict Zod schemas + retries; allow cloud adapter fallback behind flag. |
| Hardware limits (RAM/VRAM) | Document tiers (7B default, 14B optional); quantized models; graceful degradation. |
| Agent acting incorrectly on data | Confirmation prompts for destructive tools; full audit log; dry-run mode; reversible operations. |
| Scope creep across 8 phases | Phases are independently shippable; Phase 1 already delivers a usable acting-agent. |
| Refactor regressions | Phase 0 lands tests + CI before large refactors. |

## 12. Recommended Sequencing

Ship in this order for fastest daily-usable value: **Phase 0 → 1 → 3 → 2 → 7** gets you a private agent that acts on your data, grounded in retrieval, with a polished UI — the "Jarvis" core. Then **4 → 5 → 6 → 8** add teams, plugins, proactivity, and showcase polish.

