# Development Log

A running, reverse-chronological record of meaningful engineering changes. One entry per commit/work-session. Newest first.

> Convention: `## [unreleased|vX.Y.Z] — YYYY-MM-DD — Title` then **Added / Changed / Fixed / Security / Deferred / Verification** sub-sections. Keep entries factual and link to files.

---

## [unreleased] — 2026-07-19 — Security: password hashing (bcrypt) + migration

Closes the plaintext-password issue flagged across Phases 0 and 3. Branch `fix/security-and-phase-4`.

### Security
- `backend/models/User.js`: pre-save hook bcrypt-hashes the password on any change (skips values already hashed, so no double-hash); new `comparePassword()` verifies via `bcrypt.compare` and **transparently upgrades legacy plaintext rows to a hash on successful login** (migrate-on-login). Register (`User.create`) and the Phase-3 `change-password` endpoint now hash automatically via the hook.
- `backend/controllers/auth.js` login: replaced `user.password !== password` with `await user.comparePassword(password)`.
- `backend/scripts/hash-passwords.js`: idempotent one-shot migration to bulk-hash any remaining plaintext rows (belt-and-suspenders for users who don't log in soon). Run `cd backend && node scripts/hash-passwords.js`.

### Verification
- `node --check` on all three files. Runtime (scratch DB): hash-on-create (stored value is a `$2…` hash), compare correct→true / wrong→false, legacy plaintext row upgraded on compare and re-verifies against the new hash, migration script hashed a seeded plaintext row and skipped already-hashed ones. All PASS.

---

## [unreleased] — 2026-07-19 — Phase 3: power features on existing rails ([task.md](../task.md) Phase 3)

All 7 Phase 3 tasks on branch `fix/phase-3-power-features` (off Phase 2).

### Added
- **6 new agent write-tools** (`backend/services/agent/tools/`): `complete_task`, `create_goal`, `update_goal_progress`, `log_health`, `add_calendar_event`, `add_contact` — following the `defineTool` (JSON-Schema + Zod + `ctx.userId`) pattern; registered in `tools/index.js` (now 10 tools). The agent can modify records across Tasks/Goals/Health/Calendar/Contacts, not just create. `TOOL_META` in AgentPage synced.
- **Assistant merge** (3.1): `/ai-chat` now redirects to `/agent`; `AiChatPage` retired from routing/sidebar. The agent `chat` controller falls back to plain chat via the Gemini→ChatGPT→Ollama cascade (`aiService.generateText`) when Ollama is offline (so it always answers, just without tools). Agent page gained a **run-history + tools drawer** (`getAgentRuns`/`getAgentTools` — previously built, never called) and a **persistent `conversationId`** (localStorage) passed to the stream so threads survive refresh.
- **Calendar timed events + drag** (3.3): all-day toggle + `datetime-local` inputs; `editable`/`eventDrop`/`eventResize` wired to `calendarApi.update`; task `dueDate`s and goal `deadline`s overlaid as read-only background events that link to their pages on click.
- **External scheduler** (3.4): `POST /api/cron/run` authed by `X-Service-Token` (env `SERVICE_TOKEN`) runs the scheduler's per-user JOBS; `.github/workflows/cron.yml` fires them on a UTC schedule for serverless deploys; DEPLOYMENT.md documents both tiers.
- **Forced password change** (3.7): `POST /auth/change-password` (authed) sets a new password + clears `accountConfig.mustChangePassword`; `ForcePasswordChange` screen gates the app via `ProtectedRoute` when the flag is set.

### Changed
- **Portfolio completeness** (3.5): delete-project (killed/done), decision-review workflow (mark reviewed + record outcome), `tags`/`links.deploy`/`links.docs` surfaced on cards, empty-state CTA to the GitHub importer, and a **"Register GitHub webhooks"** button in Command Center (was claimed "automatic"; now an explicit action).
- **Permission catalog** (3.6): added `command_center` + `portfolio` permission ids; `/hq` and `/portfolio` gate on them (were `ai_chat`/`tasks`); the Permission Matrix renders them automatically.
- Admin **2FA checkbox disabled** with a "coming soon" note (it stored an inert flag).

### Security
- **Passwords are stored/compared in plaintext** (`auth.js` login: `user.password !== password`, "local dev" comment). The new `change-password` deliberately follows the same scheme rather than diverging (bcrypt on one path would break login). **Flagged as a required security follow-up** — hash all passwords + migrate. Not done here to avoid breaking existing logins mid-phase.

### Verification
- `yarn build` green; `node --check` on all new backend files; eslint clean on new files (remaining `any` are pre-existing baseline). Browser: `/ai-chat` redirects to `/agent`; the merged page shows History + Tools.
- Runtime (scratch DB): `complete_task` marked a task done; `log_health` set energy + a habit; registry reports 10 tools; cron endpoint = 401 without token / 200 with valid token; `change-password` updated the password and flipped `mustChangePassword` to false. All PASS.

---

## [unreleased] — 2026-07-19 — Phase 2: honest modules ([task.md](../task.md) Phase 2)

All 4 Phase 2 tasks on branch `fix/phase-2-honest-modules` (off Phase 1). Theme: kill the fakes; show the truth.

### Changed
- **Blogs → Reading Room** (`src/pages/BlogsPage.tsx` full rewrite): the 6 hardcoded fake articles are gone. Now lists the real RSS-ingested `BlogPost`s via `staffApi.listPosts` (source derived from each link's hostname, newest first, search + source filter) with a Sources panel to add/pull/delete feeds via `ingestApi` (same pipeline the Command Center uses). Honest empty state points to "add your first feed."
- **Workflow Manager honesty** (`WorkflowManagerPage.tsx`): prominent **"⚠️ Simulation mode"** banner; the fake "Readiness %" replaced with a real setup **checklist** of what's actually configured; connections panel labeled "simulated / no OAuth yet"; "Success Blueprint" relabeled "🛣️ Roadmap to go live (not yet built)."
- **Real DM triage** (`backend/services/automationService.js`): `runDMTriage` now reads the user's `dmRules.leadKeywords`/`urgentKeywords` from Settings and categorizes per-DM (lead keyword → `category:'lead'`; urgent keyword → `status:'escalated'`; else `acknowledged`) instead of blindly flipping everything to acknowledged.
- **Workflow schema**: added `postedAt` + `publishedUrl` to `WorkflowQueueItem` (automation already wrote `postedAt`, silently dropped by strict mode).
- **Settings truthfulness** (`SettingsPage.tsx`): the hardcoded "🟢 Atlas" badge replaced with a **live** reachability check polling `GET /api/health` every 15s (🟢 Online / 🔴 Offline / … Checking); removed the stale "Personal Space v3.0 — Phase 3 ✅" footer.
- **Chat vs Agent differentiation** (`AiChatPage`, `AgentPage`, `PersonalSidebar`): honest titles ("AI Chat — ask & talk" vs "Agent — acts on your data"), a cross-link banner on each, sidebar renamed ("AI Chat" / "Agent (takes action)"). The misleading "Preview mode active" badge now states the real provider cascade (your cloud key vs local Ollama).

### Notes
- `browserWorkspace` config (dead surface flagged in the audit) is not rendered anywhere and isn't in the active frontend config default — left the harmless backend schema field rather than risk a migration; safe to delete later.

### Verification
- `yarn build` green; `node --check` on the two backend files; eslint clean on touched files (3 remaining `any` are pre-existing baseline on untouched lines).
- Runtime-tested against a local Mongo scratch DB: seeded 3 "new" DMs + keyword rules, ran `POST /automation/run` → lead DM got `category:'lead'`, urgent DM got `status:'escalated'`, plain DM `acknowledged`; `GET /api/health` → 200. Both PASS.

---

## [unreleased] — 2026-07-19 — Phase 1: data integrity & consistency ([task.md](../task.md) Phase 1)

All 9 Phase 1 tasks on branch `fix/phase-1-consistency` (off Phase 0).

### Added
- `src/constants/capture.ts` — single `CAPTURE_TYPES` source of truth (+ `captureMeta`). Consumed by CapturePage, Home quick-bar, QuickNotesPen, Sage Studio, and VoiceTranscriber; the five divergent local arrays are deleted, so `Article`/`Urgent` are now reachable everywhere and the Home bar has real type chips (was hardcoded to `Idea`).
- `src/utils/date.ts` — `localToday()`/`localDate()` replacing UTC `toISOString().slice(0,10)` in Finance, Career, Social, Health, Home, and Calendar (fixes the IST off-by-one at day boundaries).
- `src/utils/notify.ts` — `notifyError()` (prefers backend message, toasts, logs).
- Backend `updateTransaction` + `PUT /finance/:id`; client `financeApi.update`.

### Changed
- **Real habit streak**: `getDashboardStats` now returns `habitsDoneToday` (0–6 ring) and a true consecutive-day `habitStreak` (walks the last 90 Health docs, tolerant of an unlogged today). Home ring + streak copy and Sage's nudge are now truthful.
- **Finance**: Budget Overview reads/writes real budgets via the previously-orphaned `budgetApi` (editable per-category limits, all categories); transactions are editable; `formatINR` fixed for negatives (`-₹1,500`).
- **Editing added** where it was missing: Tasks (inline edit + the dead `dueDate` field wired end-to-end with an overdue/today badge), Goals (title/area/deadline edit, milestone delete, **debounced** progress slider — was one PUT per drag-tick, now one on pause; deadline shows "N days left / overdue"), Knowledge (modal Edit → reuses the create form via the existing update endpoint).
- **Error sweep**: ~23 previously silent mutation handlers in Career, Social, and Workflow Manager now surface a toast via `notifyError`; SocialPage gained a visible load-error banner.
- **Double-submit locks** on the two unguarded capture forms (CapturePage, Home).

### Verification
- `yarn build` green; eslint clean on touched files (remaining `any`/deps warnings are pre-existing baseline on untouched lines).
- Runtime-tested against a local Mongo scratch DB: seeded 3 consecutive habit days → `dashboard/stats` returned `habitStreak:3, habitsDoneToday:1`; created a transaction then `PUT /finance/:id` updated the amount 100→250. Both PASS.

---

## [unreleased] — 2026-07-19 — Phase 0: critical bug fixes ([task.md](../task.md) Phase 0)

Executed all 9 Phase 0 tasks from the audit roadmap on branch `fix/phase-0-critical-bugs`.

### Fixed
- **AI Chat was 100% down**: added the missing `const ChatConversation = require(...)` to `backend/controllers/chat.js` (used 7× but never imported → `ReferenceError` on every call).
- **Three frontend→backend route mismatches**: `statsApi` `/stats`→`/dashboard/stats`; Settings export `/personal/export`→`/export-all` (+ `res.ok` guard, honest copy); workflow DM `/workflow/dm`→`/workflow/dm-activity` (`src/services/personalApi.ts`, `src/pages/SettingsPage.tsx`).
- **Brittle `Promise.all`**: `Home.tsx` loadData and `WorkflowManagerPage.tsx` loadAll now load each widget independently (`Promise.allSettled` / per-fetch), so one 404 no longer blanks unrelated sections or hangs the insights spinner.
- **Null-result crashes**: `updateTask`/`updateGoal`/`updateCalendarEvent` (+ Capture/Knowledge/Job/Cert/Skill/Contact/Idea/Queue/DM) now return 404 on a not-found/unowned update instead of `data:null`; frontend guards (`PersonalTasksPage`, `GoalsPage`) never splice a falsy result into list state.
- **Mass-assignment**: added a `sanitize()` helper in `personal.js` stripping `userId`/`_id`/`__v`/timestamps from every by-id update body — a PATCH can no longer reassign record ownership.
- **Calendar modal false success**: `Calendar.tsx` only closes/resets on a successful save; added visible page + modal error banners and a saving state (was: modal closed even on failure, zero error surface).
- **AI Chat undefined bubbles**: `AiChatPage.tsx` now checks `res.success` + payload shape before rendering (was: pushed blank `undefined` messages on failure because the service swallows errors into `{success:false}`).

### Security
- Discovered a **live MongoDB Atlas connection string with plaintext credentials** in the untracked dev file `backend/test-connection.js`. It was never committed; added it (and `docs/reports/`) to `.gitignore` so it can't be. **The credential must be rotated** — it has been sitting in a plaintext working-tree file.

### Verification
- `corepack yarn build` green; `node --check` on both backend controllers; eslint clean on touched files (the 7 remaining `any` warnings are pre-existing baseline on untouched lines).
- Runtime-tested against a local Mongo scratch DB with a seeded user + JWT: `/dashboard/stats`→200 (old `/stats`→404), `/export-all`→200, `/workflow/dm-activity`→200 (old `/workflow/dm`→404); mass-assignment PATCH left `userId` unchanged while updating the title; PATCH of a bogus id→404; AI Chat got past the `ChatConversation` persistence (hung on the downstream Ollama call rather than instantly throwing).

---

## [unreleased] — 2026-07-19 — Full-portal audit → enhancement roadmap ([task.md](../task.md))

Documentation-only session. Six parallel module audits (Tasks/Goals/Calendar · Finance/Career · Knowledge/Blogs/Social · Health/Capture/Notebook · Workflow/AIChat/Agent · Home/HQ/Portfolio/Settings/Admin) produced file:line-level findings, synthesized into **`task.md`** at the repo root — the active Phase 0–4 work queue with checkboxes, files, and acceptance criteria per task.

### Headline findings (verified first-hand, not just by audit agents)
- **AI Chat is 100% non-functional**: `backend/controllers/chat.js` uses `ChatConversation` 7× but never requires it → `ReferenceError` on every call, double-swallowed by service-layer catches into blank chat bubbles.
- **Three frontend→backend route mismatches**: `statsApi` calls `/stats` (real: `/dashboard/stats`) — breaking Home stats, the habit ring, AND Sage's data nudge; Settings export calls `/personal/export` (real: `/export-all`); Workflow Manager calls `/workflow/dm` (real: `/workflow/dm-activity`) — and because it's inside a `Promise.all`, the 404 blanks config+queue too.
- **Null-result + mass-assignment pattern** across `updateTask`/`updateGoal`/`updateCalendarEvent`: no null-check after `findOneAndUpdate` (frontend splices `null` into list state → render crash) and raw `req.body` passed to updates (client could smuggle `userId`).
- **Three "mockup" surfaces**: Blogs (6 hardcoded fake articles; the real RSS pipeline only feeds Command Center), Workflow Manager connections/automation (no OAuth/Graph API/webhook anywhere — status-flip simulation), Settings' "🟢 Atlas Connected" badge (static string, not a health check).
- **Five capture entry points with five divergent type lists** (Article unreachable from 3; Home hardcodes everything to `Idea`).
- **"Habit streak" is fictional** — every surface shows habits-done-today, no streak computation exists.
- **Scheduler never fires on default deploy** — `ENABLE_SCHEDULER=false` default + serverless can't hold an interval; "generates automatically at 7:00" copy is untrue on Netlify.

### Added
- `task.md` — Phase 0 (9 critical fixes) → Phase 1 (consistency: shared capture types, local-date util, real streak, error sweep, edit UIs, Finance budgets) → Phase 2 (honesty: Blogs→Reading Room, Workflow simulation labeling + real dmRules triage, live health badge) → Phase 3 (assistant merge, agent write-tools, timed calendar + drag, external cron, Portfolio/permission completeness, enforce mustChangePassword) → Phase 4 (growth bets, each skippable). Includes 7 locked design decisions and standing quality gates.
- `docs/DOCS_INDEX.md` — linked task.md as the active work queue.

### Verification
- Doc-only: no code changed this session. The four headline bugs were re-verified against the working tree by direct grep before being locked into Phase 0.

---

## [unreleased] — 2026-07-18 — Sage v3: radial quick-action ring, double-click-to-talk, real speech-bubble nudges

Follow-up to the orb rebuild: "more actions, better design, think of any other design" — a genuinely new interaction surface rather than more decoration on the sphere itself.

### Added
- **Radial quick-action ring** (`SagePersona.tsx`) — right-click or long-press (520ms) Sage to pop 5 icon buttons in a real circle around the orb: 🎙️ Start talking, 📝 Quick note, 📷 Snapshot, 🏠 Bring home (dock), 😴 Sleep now. Closes on selection, outside click, or Escape. Chosen over a plain dropdown menu because a circular menu around a sphere is native to the character, not bolted on.
- **Double-click to talk** — a genuine double-click jumps straight into voice recording, bypassing the studio's tab navigation. Uses the standard 230ms click/dblclick disambiguation timer so a normal single click still opens the studio normally.
- **Intent pipeline**: `SageIntent` (`'default' | 'talk-record' | 'note' | 'camera'`) in `sage/types.ts`, threaded `SagePersona → GlobalAIHub → SageStudio` so the ring/double-click can open the studio **directly on the right tab and already doing the thing** — Talk tab auto-starts recording, Note tab auto-focuses the textarea, Camera tab auto-opens the camera preview. Each auto-trigger uses a ref-guarded one-shot effect (not a raw mount effect) so it fires exactly once even under React 18 Strict Mode's dev-only double-invoke, and passes `exhaustive-deps` cleanly (refs are exempt from the rule by design — no disable comments needed).
- **Real speech-bubble nudges** — every ~110s, while idle/awake/closed, Sage fetches the same dashboard stats as Home (`statsApi.get()`) and shows a bubble with an actually true statement: tasks left today, habit streak, "got a thought?" if nothing's captured yet, or an all-caught-up message. Tapping it opens the studio. This was the point of giving Sage a body in the first place — a character that occasionally lies (generic "you've got this!" filler) would undercut the whole exercise, so every nudge is grounded in real data or silently skipped if the backend is unreachable.
- **Shimmer polish** — a slow diagonal light sweep across the orb surface (`::after`, `mix-blend-mode: screen`) for the last bit of "real material, not a flat fill."

### Verification
- `yarn build` passes, ESLint clean on every touched file.
- Live-verified: right-click dispatches the ring with all 5 buttons rendered at 5 distinct, correctly-circular on-screen positions (confirmed via `getBoundingClientRect`, not just DOM presence); clicking "Quick note" opens the studio with `document.activeElement` landing on the Note tab's textarea (`tagName === 'TEXTAREA'`, matching placeholder) and the Note tab visibly active — the full ring → intent → auto-focus pipeline confirmed end to end. Talk/Camera auto-start paths were verified by source/logic review only, not by triggering real device prompts (the sandboxed preview pane hangs on `getUserMedia`/`getDisplayMedia` permission dialogs — a pane limitation hit in the previous pass too, not a product bug); please sanity-check those two in a real browser.

### On Obsidian (discussed, not built)
User asked whether a custom Obsidian plugin is needed for a "central repo." Recommendation: no — a custom plugin is a second codebase to maintain running inside Obsidian's own shell, and Sage/Notebook already cover that UI surface. If/when wanted: a **read-only vault importer** (parse `.md` files off disk, same zero-dependency pattern as the RSS/GitHub importers) covers "pull my notes in"; the existing community **Obsidian Local REST API** plugin (no code to write) covers "push captures out as vault notes." Not implemented this session — flagged for whenever it's actually wanted.

---

## [unreleased] — 2026-07-18 — Sage v2: from cartoon circle to a living orb, and made fully movable

Two follow-up passes on Sage in the same session, both direct responses to user feedback on the first cut.

### Pass 1 — Sage becomes movable and page-aware
- `SagePersona.tsx` rewritten: **draggable** anywhere on screen (pointer capture, click-vs-drag disambiguation via a 6px movement threshold), position persisted to `localStorage` and re-clamped on resize, **autonomous wandering** every ~6s (22% chance) to a new resting spot with an eased position transition, **sleeps after 45s** of inactivity and wakes on activity, a hover-revealed **dock pin** (⌂) to snap back to the default corner, and steers clear of the Notebook edge-tab's resting zone.
- Mood set expanded from 3 to 5: `idle | listening | happy | thinking | concerned`, defined once in `sage/types.ts`.
- `GlobalAIHub.tsx` rewritten: reads `useLocation()` and shows a small per-page badge (💰 Finance, ⏰ Calendar, 🧠 Agent/AI Chat, 📋 HQ, etc.) with a pop-in animation on change; a brief "noticing the new page" pulse when idle.
- `SageStudio.tsx`: added a `flash(mood, ms)` helper (sets a mood, auto-reverts to idle) wired into every real error path (mic/camera/screen denial, save failures, refine/analyze/agent failures) and `onMood('thinking')` into async AI calls — Sage now visibly reacts to what's actually happening, not just recording state.

### Pass 2 — the character itself: cartoon → living orb
User feedback: the SVG face-on-a-circle "still looked like a circle... no definition of realism." Researched what production assistants actually ship (Siri's orb, Microsoft Copilot's "Mico" — "a warm, blob-like figure... changes color to reflect conversation dynamics") before rebuilding, rather than iterating on the cartoon further. Decision (user-selected): a CSS/SVG **living orb** with real light modeling — matches the current industry pattern, adds no dependency, stays fully compatible with the existing drag/wander system. (WebGL/React-Three-Fiber and Rive were considered and declined — heavier dependency and/or an external authoring tool, respectively.)

- **Removed**: the old SVG face (eyes/lids/mouth-path/eyebrows/sweat-drop) and the stick-figure arms/legs body language entirely — `SageFace.tsx` deleted.
- **Added** `sage/SageOrb.tsx` + a full rewrite of the character CSS in `sage.css`: a sphere built from a 4-stop radial-gradient (off-center highlight simulating a light source) plus layered inset `box-shadow`s for ambient occlusion and a rim highlight, a separate blurred specular-highlight layer (`mix-blend-mode: screen`), a grounding contact shadow beneath, and two soft glowing "eye" facets (radial-gradient + glow, not flat cartoon circles).
- **Real dimensionality, no WebGL**: `transform-style: preserve-3d` + `rotateX/rotateY` driven by two mechanisms — cursor proximity (the whole orb tilts toward the cursor, not just the pupils) and drag velocity (tilts like a ball being pushed), using typed `@property --sage-hue`/`--sage-glow` so mood color changes genuinely *transition* instead of snapping.
- **Mood is now color + light + motion**, not facial expression: idle = violet, listening = brighter same-hue + sonar rings, thinking = cool cyan with a slow independent sway + tiny orbiting glow motes, happy = warm pink/gold with a joyful bounce, concerned = amber with a gentle droop — directly modeled on Mico's "color reflects conversation dynamics" approach.
- Walking/dragging re-imagined as physics a sphere would actually have: a rolling squash-and-stretch cycle instead of animated legs; being held brightens/enlarges the orb and shrinks the contact shadow (lifted-up feel) instead of arm articulation.
- `SageStudio.tsx` header avatar swapped to the same `SageOrb` (non-grounded, no contact shadow/orbit ring, just the sphere) so the mini avatar and the big roaming character are visually the same being.

### Verification
- `yarn build` passes, ESLint clean on every touched/new file, `node --check` clean on backend files from the same session.
- Live-verified via computed styles (screenshot capture became stuck at the tool/pane level partway through — confirmed via `document.readyState`/DOM queries that the *app* stayed fully responsive throughout, this was a capture-pipeline issue, not a regression): the orb's `background-image` is a real 4-stop radial-gradient, `box-shadow` carries the two inset AO/highlight layers plus the drop shadow, the breathing `transform: scale(...)` animation is live, and a full mood round-trip (idle → thinking → concerned → auto-revert to idle) was captured via `--sage-hue`/`--sage-glow`/class-name inspection through the Refine-button failure path.
- One earlier screenshot (before the capture pipeline stuck) directly confirmed the visible result: a shaded sphere with an off-center bright highlight and darker far edge — a real lit sphere, not a flat gradient circle.

### Known limitations
- No coordination between Sage's wander/rest zones and the Notebook drawer's *open* state (only its collapsed tab) — a rare cosmetic overlap, not a functional bug.
- `rotate3d`/`@property` require a Chromium-based browser (Chrome/Edge) — consistent with this app's existing browser support baseline (Speech Recognition already required the same).

---

## [unreleased] — 2026-07-18 — Sage: the AI hub becomes a living assistant persona + capture studio

The floating "AI Magic Hub" sparkle button is now **Sage — your personal scribe**: a character with a face and moods, and a five-mode capture studio behind it. Everything Sage does gets written down.

### Added — the persona (`src/components/sage/SagePersona.tsx` + `src/styles/sage.css`)
- A drawn SVG face on the FAB whose **pupils follow the cursor anywhere on the page** (CSS vars set via rAF — zero re-renders), **blinks** on a natural random rhythm (with occasional double-blinks), **breathes**, **falls asleep after 45s** of no mouse activity (eyes close, z's drift up, status dot turns amber) and **wakes on movement**, **smiles wider + blushes on hover**, ripples **sonar rings while listening/recording** (status dot pulses red), and does a **bounce celebration** whenever something is saved. Orbiting dashed halo, drifting sparkle motes, quill-antenna. All honoring `prefers-reduced-motion`.

### Added — the studio (`src/components/sage/SageStudio.tsx`)
Right slide-over with five modes:
- **Talk** — live speech-to-text (en-IN / en-US / hi-IN, interim results, auto-restart) **plus simultaneous audio recording** (MediaRecorder → downloadable .webm), mic-level equalizer, duration/word counters, crash-proof draft, save-to-inbox with type chips, **AI Refine**, and **"Ask my Agent to act on this"** — streams the transcript through the Phase-1 agent runtime (`streamAgentChat`) so a spoken thought becomes a created task/expense/capture.
- **Note** — scratchpad that **autosaves every keystroke** to localStorage (drafts survive refreshes and crashes), word count, type chips.
- **Camera** — live preview, **clip recording** (→ .webm download + a Journal entry logging it), **snapshot → AI vision analysis**.
- **Screen** — same for screen sharing (getDisplayMedia): record work sessions, snapshot the screen and ask AI "what am I working on".
- **Ledger** — a persisted log (localStorage, cap 60) of everything Sage did with timestamps; text artifacts also land in the Capture inbox.

### Added — backend vision
- `aiService.analyzeImage()` — Gemini 1.5 Flash vision (`inline_data`) with GPT-4o-mini (`image_url`) fallback, clear error when no cloud key (local Ollama text model can't see). Uses the per-user keys already stored in Settings → AI.
- `POST /api/personal/intelligence/analyze-image` (controller strips data-URL prefixes, caps payload; server already allowed 10 MB JSON). Client: `aiIntelligence.analyzeImage()`.

### Changed
- `GlobalAIHub.tsx` rewritten as the thin persona+studio orchestrator (mood state, celebration timing). `VoiceTranscriber` remains for the Capture page.
- `aiIntelligence.ts` — removed the `any` in `unpack`, typed every method's return (`string` / `string[]`), which also fixed latent unknown-typing in 4 consumer pages.

### Verification
- `yarn build` + ESLint clean on all touched files; `node --check` on the three backend files. Live browser pass: **eye-tracking proven** (pupil CSS vars flip sign as the cursor crosses the FAB), studio opens with all five tabs in Book and classic skins, mic and camera denial paths show graceful messages (the embedded preview pane blocks devices — real Chrome will prompt), note autosave verified in localStorage (including live keystrokes typed by the user mid-test).

### Notes
- Recordings download to the device by design (no media-upload infra yet); transcripts, notes, and analyses persist to the DB via `captureApi`.
- Follow-ups: voice replies (TTS) so Sage talks back; hotword "Hey Sage"; media upload to GridFS/S3; interval-snapshot "focus session" analysis.

---

## [unreleased] — 2026-07-18 — Notebook: replaced the dead Freshworks widget with a real quick-capture tab

The user pointed at a specific DOM element — `#fw-custom-launcher`, a "Support" chevron tab — and asked what it was for. It turned out to be inert template cruft: a third-party **Freshworks support-chat widget** hardcoded into `index.html`, pointed at a widget ID unrelated to this product, plus a Remix Icon font CDN loaded solely for its chevron glyph. Neither was referenced anywhere in `src/`. Repurposed the exact same edge-tab slot into a real, useful feature instead of just deleting it.

### Removed
- `index.html` — the entire Freshworks embed (inline styles, `fwSettings`/launcher-wiring script, the `ind-widget.freshworks.com` remote script tag, the `#fw-custom-launcher` div) and the now-unused Remix Icon CDN `<link>`.

### Added
- `src/components/QuickNotesPen.tsx` — a themed edge tab (same right-side slot the old widget occupied) that slides out a **Notebook** panel:
  - **Quick capture** — textarea + type chips (Idea/Task/Journal/Follow-up/Money/Urgent) posting through the same `captureApi.create()` every other capture entry point uses (Home's quick-capture bar, `/capture`) — one inbox, multiple doors.
  - **Quick actions** — direct links to New Task, Log Expense, New Event, and the full Capture page.
  - **Mobile bridge** — a QR code (generated fully client-side via the new `qrcode` dependency, zero third-party network calls) encoding `window.location.origin`. Scanning it opens this same portal on your phone; sign in once there and everything captured stays in sync since it's the same account. Includes a "Copy link" fallback.
  - Theme-aware icon: plain pen (`lucide-react` `PenLine`) in the classic skin, a quill (`Feather`) in the Book skin — same pattern as `BookToggleButton`. No new book-theme CSS needed: the component reuses the exact utility classes (`rounded-2xl`, `bg-gradient-to-br…via-indigo-600`, `bg-white`, `border-gray-100`, etc.) that `book-theme.css` already remaps, so in Book skin the tab renders as gilded leather with a gold double border automatically.
  - Closes on outside click, Escape, or after following a quick action.
- Mounted in `AppLayout.tsx` alongside the existing `GlobalAIHub` FAB (distinct position — right-edge tab at `bottom-150px`, not the corner circle — no visual collision).

### Verification
- `yarn build` passes; ESLint clean on both new/touched files.
- Verified live in the browser in both skins: tab renders correctly (violet gradient / gilded leather+quill), opens/closes, capture submit fires the real `POST /api/personal/captures` request (confirmed via network log — 500 only because no backend was running in this dev session, same as every other capture entry point), QR renders and re-tints per skin, confirmed zero `freshworks.com` network requests post-removal.

---

## [unreleased] — 2026-07-18 — "Book" skin: the portal as an illustrated journal

A second visual identity for the whole portal, switchable in one click and fully independent of light/dark. The ideology: **bookkeeping as beautiful book-keeping** — every page of the app becomes a page of a living journal.

### Added
- `src/styles/book-theme.css` — the entire skin as **pure CSS**, keyed off a `.book` class on `<html>`. Unlayered rules deliberately outrank Tailwind's `@layer` utilities, so no component markup changed. Design tokens as CSS variables: paper, aged paper, desk, ink (3 weights), rule lines, oxblood accent (replaces violet), gold tooling, leather. `.dark.book` swaps the tokens for **night reading** (dark leather desk, lamplit parchment).
  - Typography: EB Garamond (body/headings) + Caveat (handwritten `h1` greetings and **all text inputs** — you literally handwrite into the book on dashed rules). Section `h2`s get a `❦` fleuron.
  - Cards (`rounded-2xl`) become stacked paper sheets: layered offset box-shadows + slightly organic corner radii + SVG-noise paper grain. Hero gradient becomes a tooled-leather cover with a gold double border; small gradient tiles get a vintage-plate sepia treatment.
  - Sidebar becomes a table of contents with a stitched leather spine (10px leather border + dashed "stitching" pseudo-element). Header gets a double-rule underline; scrollbars become gold ribbons; toasts render on parchment.
- `src/components/decor/BookDecor.tsx` — "the living margins": hand-drawn animated SVG art in a fixed overlay (`pointer-events: none`, `aria-hidden`): a paper plane crossing the sky, a vintage car driving the bottom edge with spinning wheels, a reading robot that bobs/waves/blinks, a hot-air balloon drifting up the right margin, a fountain pen endlessly drawing a flourish (dash-offset animation), distant birds, gold filigree corners. Hidden below 900px (car/balloon/pen) and fully disabled under `prefers-reduced-motion`.
- `ThemeContext` — new `skin: 'classic' | 'book'` dimension with `toggleSkin()`, persisted to `localStorage.skin`, applied as the `.book` root class. Orthogonal to `theme` (light/dark), so all four combinations work.
- `BookToggleButton` (open-book icon, amber when active) mounted in `AppHeader` next to the dark-mode toggle — the one-click instant switch.

### Verification
- `yarn build` passes; ESLint clean on touched files. Verified live in the browser: day-reading and night-reading renders (Home + Command Center), computed styles confirm Garamond body / Caveat handwriting inputs with dashed rules / transparent input backgrounds, 8 decor nodes mounted with `pointer-events: none`, navigation + search palette functional in book mode, and the instant round-trip back to the classic skin with zero residue.

### Notes
- Functionality untouched by design: the skin is one root class + one stylesheet + one decorative component. Killing `book-theme.css` reverts everything.
- Follow-up candidates: page-turn transition on route change, per-module marginalia (different decor per page), pressed-flower/stamp art on empty states.

---

## [unreleased] — 2026-07-18 — CEO OS: approval queue, morning brief, ghostwriter, portfolio kill review, ingestion

The portal's operating model inverted: from a system of record you type into, to a staff that works overnight and queues its output for your approval. Four features shipped as one layer.

### Added — Backend (staff agents)
- Models: `Project` (portfolio entity with active/parked/killed/done + `githubRepo` matching), `WorkItem` (the approval queue), `Brief` (morning/portfolio, upserted per day), `Decision` (decision journal with review dates), `ActivityEvent` (ingested GitHub/RSS/manual activity), `BlogPost` (ingested posts, dedupe on guid), `IngestSource` (RSS feed config).
- `services/staff/chiefOfStaff.js` — morning brief generator: gathers hard facts (tasks, captures, project staleness, pending approvals, activity, latest post), writes the narrative via Ollama, **falls back to a deterministic template when the engine is offline** — the brief always ships.
- `services/staff/ghostwriter.js` — one source → LinkedIn post + X thread + reel script, each queued as a pending `WorkItem`. Nightly job drafts from un-ghostwritten blog posts.
- `services/staff/analyst.js` — the Friday kill review: staleness (≥14 days) + weekly event counts per project → memo (LLM or template) + one "park or kill?" decision per stale project in the queue. **Approving the decision actually parks the project.**
- `services/scheduler.js` — zero-dependency clock scheduler (07:00 brief, 02:00 ghostwriter, Friday 16:00 review, hourly RSS). Enabled via `ENABLE_SCHEDULER=true`, long-running tier only.
- `services/ingest/rss.js` — zero-dependency RSS 2.0/Atom parser; upserts BlogPosts, embeds them into the RAG store (`module: 'blogpost'`), logs ActivityEvents.
- Routes: `/api/v1/staff/*` (queue approve/reject/edit, briefs, ghostwrite, review), `/api/v1/portfolio/*` (projects CRUD, manual activity log, decisions), `/api/v1/ingest/sources*` (feed CRUD + run-now), and unauthenticated `/api/v1/hooks/github` (HMAC-verified via `GITHUB_WEBHOOK_SECRET` + `req.rawBody`; matches `repository.full_name` → bumps `lastActivityAt`).
- Env: `ENABLE_SCHEDULER`, `GITHUB_WEBHOOK_SECRET` in `config/env.js`.
- Tests: `tests/ingest.test.js` — RSS + Atom parsing, HTML stripping (12/12 suite green).

### Added — Frontend
- `pages/CommandCenterPage.tsx` (`/hq`) — morning brief (lite markdown renderer), approval queue with pending/approved/rejected tabs and per-item approve/edit/reject/copy, ghostwriter panel (paste text or pick an ingested post), data sources config (RSS add/pull/delete + GitHub webhook setup instructions), engine-offline banner.
- `pages/PortfolioPage.tsx` (`/portfolio`) — project cards grouped active/parked/archive with stale badges (≥14d), inline next-action editing, park/kill/done/activate, manual "log work", WIP warning at >3 active, decision journal, activity feed, run-review button.
- `services/staff.api.ts` — typed client for all new endpoints.
- Wiring: routes in `App.tsx`, sidebar entries, command-palette entries, `featurePermissions` mappings.

### Verification
- All new backend files pass `node --check`; server smoke-boots; probes: staff/portfolio routes 401 unauthenticated, GitHub webhook 200 unauthenticated.
- Backend vitest: 12/12 passing. Frontend `yarn build` + ESLint clean on all touched files.
- Live E2E against local Mongo + real Ollama (llama3.1:8b): created projects via UI, backdated one 20 days, ran the kill review, verified the stale badge, memo, and queued park decision.

### Notes
- The staff layer runs on the Docker/long-running tier (same as the agent) — Netlify serverless only serves the CRUD APIs.
- Follow-ups: push approved drafts directly into the Workflow Manager queue (Instagram), Telegram capture bot, morning brief push notification.

### Added later same day — GitHub portfolio importer (make the portfolio *real*)
- `services/ingest/github.js` — zero-dep GitHub API client + `importUserRepos()` (creates a Project per repo, imported **parked**, backfills last ~10 commits as ActivityEvents, idempotent on `githubRepo`) and `registerWebhooks()` (bulk-registers push/PR/issues hooks on the deployed callback URL).
- `controllers/ingest.js` + routes: `POST /ingest/github/import`, `POST /ingest/github/webhooks`. Token/username read from env, never from the client.
- `scripts/import-github.js` — CLI: `GITHUB_USER=<name> node scripts/import-github.js` (public) or with `GITHUB_TOKEN` (private); `--active` flag.
- Env: `GITHUB_TOKEN`, `GITHUB_USER`, `PUBLIC_BASE_URL` (+ documented in `.env.example`). Frontend: "Import repos" control in Command Center → Data Sources, `ingestApi.importGithub/registerGithubWebhooks`.
- Docs: DEPLOYMENT.md §3a — full import + activate + webhook-registration runbook.
- **Verified against real GitHub**: imported 9 public repos of `Harsh12041995` into a scratch DB, 29 real commits backfilled, rendered in the Portfolio UI with real repo links and in the activity feed with real commit messages. Empty repos (409 on commits) handled gracefully.

---

## [unreleased] — 2026-07-18 — UI/UX upgrade: dark mode, command palette, honest dashboard, dead-code purge

### Added
- **Working dark mode**: `ThemeContext` now defaults to the OS `prefers-color-scheme`; `ThemeToggleButton` rewritten as a functional sun/moon toggle and mounted in `AppHeader`. Dark variants added across `AppLayout`, `PersonalSidebar`, `AppHeader`, and the Home dashboard.
- **Command palette**: the header search (Ctrl+K) now actually works — type to filter all portal pages (name + keywords), arrow keys + Enter to navigate, Esc/click-outside to close.
- **Functional mood check-in** on Home: persists to the same `healthApi` day record the Health page uses, with optimistic UI, rollback + error toast on failure, and "Logged: X" state.
- Personal Agent and Calendar added to the Home "Quick Access" grid.

### Changed
- **Home dashboard now shows only real data**: "Today's #1 Focus" (hardcoded 67%) replaced with live task progress from stats; "Today's Schedule" now reads real events from `calendarApi` (with empty state) instead of four hardcoded fake events; the "Life Areas Status" section (all fake scores) removed.
- Dashboard/API failures now surface as toasts instead of being silently swallowed.
- Single toast system: removed `react-hot-toast` (kept `react-toastify`, which the admin pages already use).

### Removed (dead template code — verified zero importers before deletion)
- `src/components/header/{Header,HeaderSearch,NotificationDropdown}.tsx` (superseded by `AppHeader`), all 12 files in `src/components/form/`, unused UI primitives (`ui/{alert,avatar,badge,card,input,select}`), unused hooks (`useChat`, `useDebounce`, `useGoBack`, `useProfile`, `useToast`, `hooks/index.ts`), duplicate `src/api/axios.ts`, and root scratch file `menu_fix.txt`.
- ~560 lines of dead CSS from `index.css` (1052 → ~490): ApexCharts, jVectorMap, Swiper carousels, flatpickr, the old commented-out green menu system, old sidebar animation classes, simplebar. FullCalendar styles kept (Calendar page uses them).
- Unused npm deps: `apexcharts`, `react-apexcharts`, `swiper`, `flatpickr`, `react-hot-toast`.

### Verification
- `yarn build` (tsc + vite) passes; ESLint clean on all touched files (repo has ~115 pre-existing lint issues in untouched service/type files).
- Verified live in the browser: dashboard renders in both themes, theme toggle persists, sidebar/header dark styling, empty states with backend offline, mood click issues the correct `PUT /api/personal/health/:date` and rolls back with a toast on failure.

### Known follow-ups
- Inner pages (Finance, Health, Capture, etc.) still have light-only card styling — extend `dark:` variants there next.
- `dist/` is stale in git relative to these changes (Netlify builds from source, so deploys are unaffected).

---

## [unreleased] — 2026-06-06 — RAG engine (Mongo), Docker deploy & learning guide

### Added — RAG (Phase 2 core, Mongo-aligned)
- `backend/models/Embedding.js` — vectors stored in MongoDB (one `embeddings` collection, visible in Compass), unique per (user, module, source).
- `backend/services/agent/rag/vectorStore.js` — `VectorStore` abstraction with two backends behind one API: app-side **cosine** (`local`, any MongoDB) and native **`$vectorSearch`** (`atlas`), auto-falling back if the index is absent.
- `backend/services/agent/rag/embeddings.js` — Ollama embedding wrapper (via a shared provider singleton to avoid a require cycle).
- `backend/services/agent/rag/ingest.js` — `indexRecord` / `removeRecord` / `backfillUser` for captures, knowledge, goals, journal.
- `backend/services/agent/tools/searchContext.js` — `search_personal_context` tool (registered) so the agent grounds answers in the user's real records with citations.
- `backend/services/agent/provider/instance.js` — shared provider singleton.
- `backend/scripts/backfill-embeddings.js` + `POST /api/v1/agent/reindex` — build/rebuild the index.
- `config/env.js` — added `VECTOR_BACKEND`, `VECTOR_INDEX`, `EMBED_DIM`.

### Added — Deploy system (Docker + Netlify)
- `backend/Dockerfile` + `backend/.dockerignore` — containerized API with a `/health` healthcheck.
- `infra/docker-compose.yml` — rewritten to **Mongo + Ollama + API** (dropped Qdrant; vectors now live in Mongo). One command brings up the whole agent tier.
- `.github/workflows/deploy.yml` — optional CI-driven Netlify deploy (native Git integration is the recommended default).
- `docs/DEPLOYMENT.md` — full runbook: two-tier topology, Netlify CD, Docker prod deploy, Atlas vector-index setup, Compass sync, env rules, and a **plain-English DevOps glossary**.

### Added — Learning
- `docs/guides/Agentic_DevOps_Comic_Guide.html` — a mobile-first, comic-themed guide ("The Agentic Adventure") teaching the two-tier topology, CI/CD, Docker, the agent loop, tools, embeddings, and RAG — mapped to this project, with a "talk like a pro" cheat-sheet.

### Changed
- `backend/server.js` — now listens whenever run directly (`node server.js`), so it works inside Docker / on a server; still silent under serverless.

### Verification
- `node --check` passes on all new/edited backend files; cosine similarity unit-checked (1.0 / 0.0 / −1.0). Run `cd backend && npm install && npm test` locally to execute suites.

---

## [unreleased] — 2026-06-06 — Phase 7 (core): Streaming agent chat UI

A real conversational surface for the Phase 1 agent — streams over SSE and shows what the agent *did*, not just what it said.

### Added
- `src/services/agent.api.ts` — agent client. `streamAgentChat()` consumes the SSE endpoint via `fetch` + `ReadableStream` (needed because `EventSource` can't send the JWT or POST a body), parsing `step|tool_call|tool_result|text|final|error` frames. Plus `getAgentTools()`, `getAgentRuns()`, `getAgentHealth()`.
- `src/pages/AgentPage.tsx` — streaming chat with a **live tool-call timeline** (each action shows its args and a running → ✓/✗ status), engine online/offline indicator, action-oriented suggestion chips, per-message latency + action count, Stop button (aborts the stream), and empty/loading/error states. Dark-mode aware.

### Changed
- `src/App.tsx` — added protected route `/agent` (gated by the `ai_chat` permission).
- `src/components/PersonalSidebar.tsx` — added a "Personal Agent" nav entry.

### Notes
- The endpoint resolves through the existing `apiBaseUrl` (`…/api`) → matches the backend's `/api/agent` alias; auth token read from `localStorage.accessToken` via `authService`.
- Token-by-token streaming of the final answer is a follow-up (backend emits the final text as one `text` frame today); the tool timeline already streams live.
- Frontend not built in the sandbox (npm unavailable); code written against the existing axios/auth/types conventions. Verify with `yarn build` locally.

---

## [unreleased] — 2026-06-06 — Phase 1: Agent runtime core

The assistant can now **take real actions** on the user's data via local tool-calling. Built against **Ollama's native `/api/chat` tool API with plain `fetch`** — no heavy framework dependency, fully local-first and offline-capable. A stable provider interface means a cloud adapter (Claude/OpenAI) can be swapped in later without touching the loop or tools.

### Added
- `backend/services/agent/provider/ollama.js` — `OllamaProvider` with `chat()` (tool-calling), `streamChat()` (token streaming), `embed()` (for Phase 2 RAG), and `ping()`. Maps connection failures to clear `PROVIDER_UNAVAILABLE` errors.
- `backend/services/agent/tools/defineTool.js` — declarative tool helper: JSON Schema (model-facing) + Zod schema (runtime validation) + `execute(args, ctx)`. `ctx` carries the authenticated `userId`.
- `backend/services/agent/tools/registry.js` — `ToolRegistry`: register/list/specs + a single **validated, owner-scoped, never-throwing** execution path returning `{ok,data|error}` so the model can recover from failures.
- `backend/services/agent/tools/{createTask,logExpense,addCapture}.js` — first 3 action tools, wired to the existing `Task`, `Finance`, `Capture` models.
- `backend/services/agent/loop.js` — `runAgentLoop`: plan → call tools → observe → repeat until a final answer or `maxSteps` budget; emits `step|tool_call|tool_result|text|done` events.
- `backend/services/agent/index.js` — `runAgent()` orchestration: system prompt + history assembly, loop execution, and trace persistence.
- `backend/models/AgentRun.js` — per-invocation trace (input, tool calls, output, steps, latency, status).
- `backend/controllers/agent.js` + `backend/routes/agent.js` — SSE `POST /agent/chat`, `GET /agent/runs[/:id]`, `GET /agent/tools`, `GET /agent/health`.
- `backend/tests/agent.test.js` — registry validation/auth tests + an **agent eval**: "remind me to buy milk" → asserts `create_task` is called with the right args and the loop returns a final answer (mock provider, no network).

### Changed
- `backend/server.js` — mounted the agent router at `/api/v1/agent` behind `protect` + rate limiting.

### Architecture notes
- Tools are the only path to user data → validation, authorization, and (later) audit live in one place.
- The loop runs tool-resolution turns non-streamed (to reliably detect tool calls) and emits the final answer as a `text` event; full token-streaming of the final turn via `streamChat` is a follow-up enhancement.

### Verification
- `node --check` passes on all 12 new source files; `server.js` confirmed complete via the authoritative editor view.
- Run locally (sandbox can't install deps): `cd backend && npm install && npm test` — the agent eval runs with a mocked provider, no Ollama required. For a live end-to-end test, start Ollama (`bash infra/setup-ollama.sh`) and `POST /api/v1/agent/chat`.

---

## [unreleased] — 2026-06-06 — Phase 0: Backend hardening foundation

First slice of the [Modernization & Agent Plan](./MODERNIZATION_AND_AGENT_PLAN.md). Goal: make the backend production-grade and safe to iterate on before building the agent runtime. All changes are **additive and in-place** — no disruptive restructure, so the live Netlify deploy is unaffected.

### Added
- `backend/config/env.js` — Zod-validated environment loader. Validates and coerces `process.env` at boot and **fails fast** with a readable error if config is invalid/missing. Single source of truth; also exposes `isProd/isDev/isTest` and parsed `corsOrigins`.
- `backend/config/logger.js` — structured logging via `pino`. Pretty in dev, JSON elsewhere. Redacts `authorization`, `cookie`, `password`, `token`.
- `backend/utils/AppError.js` — typed operational error class with HTTP status + machine-readable `code` + factory helpers (`badRequest`, `unauthorized`, `notFound`, …).
- `backend/middleware/errorHandler.js` — `asyncHandler` wrapper, `notFound` 404 handler, and one terminal `errorHandler` that normalizes Zod / Mongoose / JWT / duplicate-key errors into a consistent `{ success:false, error:{ code, message, details? } }` envelope.
- `backend/middleware/security.js` — `helmet` headers, explicit **CORS allow-list**, and tiered `express-rate-limit` (global + stricter auth limiter).
- `backend/middleware/validate.js` — reusable Zod request-validation middleware (`body`/`query`/`params`).
- `backend/tests/` — `vitest` suite: `health.test.js` (health endpoint + structured 404 via supertest) and `unit.test.js` (AppError behavior) + `setup.js` test env.
- `backend/vitest.config.js`, `backend/.env.example` (documented), `.github/workflows/ci.yml` (frontend lint/typecheck/build + backend lint/test gates).
- `infra/docker-compose.yml` (Mongo + Qdrant + Ollama, one-command local stack) and `infra/setup-ollama.sh` (pull `llama3.1:8b` + `nomic-embed-text`).
- `docs/MODERNIZATION_AND_AGENT_PLAN.md` — full architecture + 8-phase roadmap + task list. Linked from `docs/DOCS_INDEX.md`.

### Changed
- `backend/server.js` — rewired to use the new env/logger/security/error-handling modules. Replaced `console.log` with `pino-http` request logging. Health check moved **above** the DB-connect middleware so it reports status without forcing a connection. Canonical API surface documented as `/api/v1/*` (legacy aliases retained for compatibility). Added `trust proxy` for correct client IPs behind the CDN.
- `backend/package.json` — bumped to `3.1.0`; added deps `helmet, express-rate-limit, pino, pino-http, pino-pretty, zod`; dev deps `vitest, supertest`; scripts `test`, `test:watch`, `lint`.

### Security
- Replaced wide-open `cors()` with an explicit origin allow-list (env-driven).
- Added rate limiting (global + auth) to blunt abuse / credential-stuffing.
- Added `helmet` security headers (`nosniff`, etc.).
- Boot-time config validation prevents starting with a weak/missing `JWT_SECRET` or missing `MONGODB_URI`.
- Log redaction prevents leaking credentials.

### Deferred (tracked in plan §9, scheduled as their own PRs)
- Physical monorepo move (`apps/`, `packages/`) and `packages/shared` Zod contracts.
- Splitting the 646-line `controllers/personal.js` into a service/repository layer.
- Migrating Career & Social modules off `localStorage` to MongoDB.

### Verification
- `node --check` passes on every authored file; `server.js` confirmed complete (`module.exports = app`) and `package.json` valid JSON via the authoritative editor view.
- Test suite (`npm test`) **not executed in the build sandbox** — its npm registry could not finish installing deps (network stall, not a code issue). Run locally:
  ```bash
  cd backend && npm install && npm test
  ```

### Notes
- A file-sync quirk in the build environment (editing the same file via both editor and shell) caused a rollback once; resolved by single-tool writes. No impact on delivered files.
