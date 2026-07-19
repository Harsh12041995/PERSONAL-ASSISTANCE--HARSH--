# Deployment Runbook & DevOps Primer

This doc does two jobs: (1) a **step-by-step runbook** to ship this app, and (2) a **plain-English glossary** so every term here is one you can explain to a developer. Read top to bottom once; use it as a checklist forever after.

---

## 1. The mental model: two tiers

This product is not one deployable thing — it's two, and knowing why is half of DevOps literacy.

| Tier | What it is | Where it runs | Why |
|---|---|---|---|
| **Frontend** | The React app (static HTML/JS/CSS after `yarn build`) | **Netlify** | Static files served from a global CDN. Cheap, fast, auto-deploys from Git. |
| **Agent + API** | Express API, the agent loop, **Ollama** (local LLM), embeddings, vector search | **Your machine (dev) or your server (prod)** — via **Docker** | Ollama needs persistent compute and can't run as a short serverless function. |

> **Why not "just Netlify"?** Netlify runs static sites and **serverless functions** — small, stateless bits of code that wake up, run for a few seconds (max ~10–26s), and die. They have no GPU and can't keep a multi-gigabyte language model loaded. An agent that thinks and calls tools needs a long-running process. That's the second tier.

```
   Browser ──► Netlify (React app)
                  │  calls /api/...
                  ▼
        ┌───────────────────────────┐
        │  Agent tier (Docker)       │
        │  Express API ── Ollama     │
        │      └── MongoDB (vectors) │
        └───────────────────────────┘
```

### Where Docker fits (answer to "why not Docker?")
Docker **is** the answer for the agent tier — it just isn't something Netlify hosts. Docker packages the API + its environment into a **container** (a shipping box that runs identically on your laptop and your server). `docker compose` then starts the API, MongoDB, and Ollama together with one command. So:
- **Frontend** → Netlify (Docker not involved; it's static files).
- **Agent tier** → Docker, on your machine for dev and on your server for prod. Same `docker-compose.yml`, same behavior everywhere. That reproducibility is the whole point of containers.

---

## 2. Frontend deploy (Netlify) — the standard way

**Recommended: native Git integration (continuous deployment).**

1. Push this repo to GitHub.
2. Netlify → **Add new site → Import from Git** → pick the repo.
3. Build settings (already encoded in `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add environment variables in **Site settings → Environment variables**:
   - `VITE_API_BASE_URL` → the public URL of your agent tier, e.g. `https://api.yourdomain.com/api`
5. Click **Deploy**.

From now on: **every push to `main` deploys to production automatically; every Pull Request gets its own preview URL.** That is continuous deployment, and it's the industry standard you asked to practice.

**CI gate:** `.github/workflows/ci.yml` runs lint + typecheck + tests on every PR. Keep "Deploy only after CI passes" on in Netlify so a red build never reaches production.

**Optional CLI-driven deploys:** `.github/workflows/deploy.yml` deploys via GitHub Actions instead (needs `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` repo secrets). Most people don't need this — native Git integration is simpler.

---

## 3. Agent tier deploy (Docker)

**Local (development):**
```bash
docker compose -f infra/docker-compose.yml up -d   # starts mongo + ollama + api
bash infra/setup-ollama.sh                          # first run: pull the models
curl http://localhost:5001/health                   # should say {"status":"ok"}
```

**Production (your server / VPS / EC2):**
1. Install Docker + Docker Compose on the server.
2. Copy the repo (or just `infra/` + `backend/`) to the server.
3. Create `backend/.env` from `backend/.env.example` with **real** secrets (`JWT_SECRET`, `MONGODB_URI` if using Atlas, `CORS_ORIGINS` = your Netlify domain).
4. `docker compose -f infra/docker-compose.yml up -d --build`
5. Put **HTTPS** in front of it: a reverse proxy (Caddy or Nginx) terminates TLS and forwards to the API on port 5001. Point `api.yourdomain.com` at the server.
6. Set `VITE_API_BASE_URL` in Netlify to `https://api.yourdomain.com/api` and redeploy the frontend.

**Updating prod after a code change:** `git pull && docker compose -f infra/docker-compose.yml up -d --build`. (Later, automate this with a deploy webhook or a GitHub Action that SSHes in — a good next exercise.)

**Turn on the staff agents:** set `ENABLE_SCHEDULER=true` in `backend/.env` on this tier (never on serverless). That activates the 07:00 morning brief, 02:00 ghostwriter, Friday 16:00 portfolio kill review, and the hourly RSS poll.

**Scheduler on Netlify / serverless (no long-running process):** the in-process scheduler can't run there. Instead drive the jobs externally:
1. Set `SERVICE_TOKEN` to a long random string in the backend env.
2. Add two GitHub repo secrets: `PUBLIC_BASE_URL` (your deployed backend base) and `SERVICE_TOKEN` (same value).
3. The included `.github/workflows/cron.yml` fires on schedule (UTC) and calls `POST {PUBLIC_BASE_URL}/api/cron/run` with `X-Service-Token`, running each job for all users. Trigger manually anytime via the Actions tab ("Run workflow"). Endpoint returns 503 until `SERVICE_TOKEN` is set, 401 on a bad token.

---

## 3a. Build your real portfolio from GitHub

The portfolio starts empty. Populate it from your actual repos instead of typing them in.

**Step 1 — Import repos + backfill commits.** Two ways, same result:

- **CLI (fastest):** from `backend/`, with the agent tier's env loaded:
  ```bash
  # public repos only — no token needed
  GITHUB_USER=Harsh12041995 node scripts/import-github.js
  # include private repos + higher rate limit
  GITHUB_TOKEN=ghp_xxx node scripts/import-github.js
  # import as active instead of the default parked
  GITHUB_USER=Harsh12041995 node scripts/import-github.js --active
  ```
- **UI:** Command Center → Data Sources → "Import repos" (uses `GITHUB_USER`/`GITHUB_TOKEN` from `.env`, or a username you type).

Each repo becomes a Project card (imported **parked**), with its description, `owner/name`, last-push time, and the last ~10 commits logged as activity. Re-running is idempotent — it refreshes metadata and only adds new commits.

> **Token:** create a GitHub Personal Access Token yourself and put it in `backend/.env` as `GITHUB_TOKEN`. Classic PAT needs `repo` (private repos) and `admin:repo_hook` (webhook registration); a fine-grained token needs read-only **Contents** + **Webhooks**. Never commit it.

**Step 2 — Activate your focus.** Open Portfolio, keep **2–3 projects active**, leave the rest parked. Parked projects cost nothing and are excluded from the WIP warning; the Friday review will nudge you about stale active ones.

**Step 3 — Live activity (after deploy).** Webhooks need a public URL, so this only works once the agent tier is deployed with HTTPS. Set `PUBLIC_BASE_URL` (e.g. `https://api.yourdomain.com`), `GITHUB_TOKEN` (with `admin:repo_hook`), and optionally `GITHUB_WEBHOOK_SECRET`, then register hooks on every imported repo in one call:
```bash
curl -X POST https://api.yourdomain.com/api/v1/ingest/github/webhooks \
     -H "Authorization: Bearer <your-portal-JWT>"
```
From then on every push, PR, and issue flows into the matching project automatically. (You can also add the webhook manually per repo: **Settings → Webhooks → Add webhook**, payload URL `https://api.yourdomain.com/api/v1/hooks/github`, content type `application/json`, events: pushes, PRs, issues.)

---

## 4. Database & RAG: keeping Mongo + Compass in sync

- **Dev:** local MongoDB (the `mongo` container). Connect **MongoDB Compass** to `mongodb://localhost:27017` and open the `personal` database. You'll see every collection — including `embeddings` (the RAG vectors) and `agentruns` (agent traces). That's your "full control."
- **Prod:** **MongoDB Atlas**. Set `MONGODB_URI` to your Atlas connection string and `VECTOR_BACKEND=atlas`.

**Enabling native vector search on Atlas (one-time):**
1. Atlas → your cluster → **Atlas Search → Create Search Index → JSON editor → Vector Search**.
2. Name it `vector_index` (must match `VECTOR_INDEX` in env), on collection `embeddings`:
   ```json
   {
     "fields": [
       { "type": "vector", "path": "vector", "numDimensions": 768, "similarity": "cosine" },
       { "type": "filter", "path": "userId" },
       { "type": "filter", "path": "module" }
     ]
   }
   ```
3. `numDimensions` must equal `EMBED_DIM` (768 for `nomic-embed-text`).

If the index isn't there, the `VectorStore` automatically falls back to local cosine scoring — so **nothing breaks**, it just won't use the fast path. Same code, both environments.

**Build the index data:** after first deploy (or after importing data), run
`node backend/scripts/backfill-embeddings.js --all` (or hit `POST /api/v1/agent/reindex` as a logged-in user).

---

## 5. Secrets & env — the rules

- Never commit `.env`. It's git-ignored. Commit only `.env.example`.
- Frontend env vars **must** start with `VITE_` and are **public** (baked into the browser bundle) — never put secrets there.
- Backend secrets (`JWT_SECRET`, DB URIs, API keys) live only on the server / in Netlify's encrypted env store / in your secret manager.
- Rotate `JWT_SECRET` if it ever leaks (it invalidates existing tokens — everyone re-logs in).

---

## 6. Glossary (say these with confidence)

- **CI (Continuous Integration):** automatically build + test every change so bugs are caught before merge. Here: `ci.yml`.
- **CD (Continuous Deployment/Delivery):** automatically release passing changes. Here: Netlify on push to `main`.
- **Build:** compiling/bundling source into deployable output (`yarn build` → `dist/`).
- **Artifact:** the output of a build (the `dist/` folder, a Docker image).
- **CDN (Content Delivery Network):** a global cache of your static files so users load from a nearby server. Netlify is CDN-backed.
- **Serverless function:** small, stateless, short-lived code run on demand by the platform. Great for an API endpoint; wrong for a long-running model.
- **Container (Docker):** your app + its exact environment packaged to run identically anywhere. **Image** = the template; **container** = a running instance.
- **docker-compose:** defines and runs a multi-container app (API + Mongo + Ollama) together.
- **Reverse proxy:** a server (Nginx/Caddy) that sits in front, terminates **TLS/HTTPS**, and routes requests to your app.
- **Environment variable:** config injected at runtime (not hard-coded), e.g. `MONGODB_URI`.
- **Preview deploy:** a temporary live URL for a PR so you can review the change before merging.
- **Rollback:** reverting to a previous known-good deploy. Netlify keeps history — one click to roll back.
- **Embedding:** a list of numbers (a vector) capturing the meaning of text, so similar meanings sit close together. Produced here by Ollama's `nomic-embed-text`.
- **Vector search:** finding records whose embeddings are nearest to a query embedding — the heart of RAG.
- **RAG (Retrieval-Augmented Generation):** fetch your relevant records first, then let the model answer using them — grounded, not hallucinated.
- **Idempotent:** safe to run repeatedly with the same result (e.g. the backfill/upsert).

---

## 7. Ship checklist
- [ ] CI green on the PR
- [ ] Frontend deployed (Netlify) with correct `VITE_API_BASE_URL`
- [ ] Agent tier up (Docker), `/health` returns ok, `/api/v1/agent/health` shows Ollama reachable
- [ ] `CORS_ORIGINS` on the backend includes the Netlify domain
- [ ] Atlas vector index created (prod) and embeddings backfilled
- [ ] Test one real action end-to-end (e.g. "log ₹400 lunch") and confirm it appears in Compass
