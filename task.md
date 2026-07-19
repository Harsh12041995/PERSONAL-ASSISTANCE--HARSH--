# Portal Enhancement Roadmap — task.md

> **Created:** 2026-07-19 · **Source:** six parallel module audits (Tasks/Goals/Calendar · Finance/Career · Knowledge/Blogs/Social · Health/Capture/Notebook · Workflow/AIChat/Agent · Home/HQ/Portfolio/Settings/Admin). Every finding below carries the audited `file:line` reference so implementation sessions don't have to re-discover anything.
>
> **How to use this file:** work top-to-bottom, one phase at a time. Each task is a checkbox with **Files** (what to touch), **Do** (the change), and **Accept** (how you know it's done). Group related tasks into one commit/PR. After finishing a task-group: `corepack yarn build` + lint touched files + the task's Accept check, then tick the boxes here and add a `docs/DEVELOPMENT_LOG.md` entry (repo convention).
>
> Line numbers were verified at creation time; they drift as code changes — trust the file + symbol name over the number.

---

## Design decisions (locked in — inherited by every phase)

These resolve the structural problems the audit found. Future sessions should treat them as settled unless the user says otherwise.

1. **Blogs → "Reading Room."** The page currently shows 6 hardcoded fake articles. It becomes the reader for the *real* RSS-ingested `BlogPost` data + `IngestSource` management — both already built and working, currently only surfaced in Command Center. No new backend needed.
2. **Workflow Manager → honest simulation mode.** There is no real Instagram/Drive integration behind the "Connected" toggles (no OAuth, no Graph API, no webhook receiver — verified). Label it "Simulation" until real integration lands (optional Phase 4 bet). Meanwhile make the parts that *can* be real, real: `dmRules` keywords actually driving triage.
3. **AI Chat + Personal Agent → one Assistant.** Two overlapping chat surfaces confuse the product. Phase 0 fixes the crash; Phase 3 merges: `/ai-chat` redirects to `/agent`, Agent gains a plain-chat fallback + run-history/tools drawer (backend endpoints already exist, never called).
4. **Five capture entry points → one shared source.** CapturePage, Home bar, QuickNotesPen, SageStudio, VoiceTranscriber each redeclare their own type list and have already drifted (`Article` unreachable from 3, `Urgent` from 1, Home hardcodes everything to `Idea`). One shared constant + component.
5. **Habit "streak" → make it true.** The number shown everywhere is *habits done today* (0–6), not a streak. Compute a real consecutive-day streak server-side instead of renaming the lie.
6. **Scheduler on serverless → external trigger.** `ENABLE_SCHEDULER` can never work on Netlify functions (stateless). Add a scheduled external trigger for the 07:00 brief / nightly ghostwriter / Friday review instead of an empty promise in the UI copy.
7. **Decorative admin toggles → enforce or hide.** `mustChangePassword` gets enforced at login (a `SetPasswordPage` already exists); the 2FA toggle is hidden until 2FA is actually implemented. (`loginAccess` is already genuinely enforced — keep.)

---

## Phase 0 — Critical fixes (broken today · ~1 session · zero design decisions)

Everything here is "the code doesn't do what it plainly intended." Fix as one batch; each item is independently verifiable.

- [x] **0.1 AI Chat is 100% down: missing model import.**
  **Files:** `backend/controllers/chat.js:1-3`
  **Do:** add `const ChatConversation = require('../models/ChatConversation');` — the model is used 7× (lines 24–148) but never required, so every `chatWithBot`/`getMessages`/`clearConversation` call throws `ReferenceError`, swallowed into blank chat bubbles.
  **Accept:** with backend running, sending a message in `/ai-chat` returns a bot reply and persists both messages (check `chatmessages` collection).

- [x] **0.2 Dashboard stats 404 on every load.**
  **Files:** `src/services/personalApi.ts:336`
  **Do:** change `api.get('/stats')` → `api.get('/dashboard/stats')` (only `GET /dashboard/stats` exists — `backend/routes/personal.js:47`). This single line un-breaks Home's Quick Stats, tasks-progress hero, habit ring, **and** Sage's speech-bubble nudge (`SagePersona.tsx` calls `statsApi.get()`).
  **Accept:** `GET /api/personal/dashboard/stats` returns 200 in the network tab on Home load; stat cards show numbers, not `—`.

- [x] **0.3 Settings "Export All Data" 404s.**
  **Files:** `src/pages/SettingsPage.tsx:113-128`
  **Do:** fetch `${baseUrl}/personal/export-all` (route: `backend/routes/personal.js:48`), not `/personal/export`. Also correct the "17 collections" copy → say "all your data" (handler exports 16 — `backend/controllers/personal.js:333-354`).
  **Accept:** clicking Export downloads a JSON file containing `captures`, `tasks`, `finance`, … keys.

- [x] **0.4 Workflow Manager DM route mismatch blanks the whole page.**
  **Files:** `src/services/personalApi.ts:318-320`
  **Do:** `/workflow/dm` → `/workflow/dm-activity` in `getDMActivity`/`createDMActivity`/`updateDMActivity` (routes: `backend/routes/personal.js:119-122`).
  **Accept:** Workflow Manager loads saved config + queue on first paint (was: always defaults/empty because the DM 404 failed the whole `Promise.all`).

- [x] **0.5 Un-bundle brittle `Promise.all`s (one failure blanks unrelated widgets).**
  **Files:** `src/pages/Dashboard/Home.tsx` (`loadData`, ~line 126 — stats+captures share one `try`, and the AI-insights fetch after them never runs if either throws, leaving the insights spinner stuck forever), `src/pages/WorkflowManagerPage.tsx:39-53`
  **Do:** switch to `Promise.allSettled` (or independent try/catch per fetch); each widget renders whatever succeeded; failed pieces show their own inline error/retry.
  **Accept:** kill the backend mid-session → Home still renders schedule/mood sections and shows per-widget errors; insights spinner resolves (to empty/error state) instead of spinning forever.

- [x] **0.6 `findOneAndUpdate` null-result crashes.**
  **Files:** `backend/controllers/personal.js` — `updateTask` (~92-101), `updateGoal` (~213-222), `updateCalendarEvent` (~546-548); frontend guards in `src/pages/PersonalTasksPage.tsx:51`, `src/pages/GoalsPage.tsx:47,57,67`, `src/pages/Calendar.tsx:89-102`
  **Do:** backend — if the update query returns `null` (wrong id / not owner), respond 404 instead of `ok(res, null)`. Frontend — never splice a falsy result into list state.
  **Accept:** PATCH a bogus task id via curl → 404 `{success:false}`; UI list never renders a blank/crashed row after a failed update.

- [x] **0.7 Mass-assignment: raw `req.body` into updates.**
  **Files:** `backend/controllers/personal.js` — every update handler that spreads/passes `req.body` into `findOneAndUpdate` (Tasks ~96, Goals ~217, and sweep the rest of the file: captures, knowledge, career, contacts, ideas, platforms, workflow, calendar, health)
  **Do:** whitelist updatable fields per handler (destructure allowed keys; never accept `userId`/`_id` from the body). Pattern: `const { title, priority, area, tab, done, dueDate } = req.body; ...findOneAndUpdate(query, { $set: pick })`.
  **Accept:** a PATCH including `"userId": "<other-user-id>"` leaves the document's `userId` unchanged.

- [x] **0.8 Calendar modal reports false success.**
  **Files:** `src/pages/Calendar.tsx:75-121`
  **Do:** move `closeModal(); resetModalFields();` inside the success path only; on failure keep the modal open and show an error (page currently has *zero* user-facing error state — add one, `console.error` only today at 36-51, 123-133).
  **Accept:** with backend stopped, saving an event keeps the modal open and shows an error message; nothing silently disappears.

- [x] **0.9 AI Chat renders `undefined` bubbles on failure.**
  **Files:** `src/pages/AiChatPage.tsx:120-135`, `src/services/chat.api.ts:21-47`
  **Do:** the service layer swallows all errors into `{success:false}`, so the page's catch is dead code and it pushes `undefined` messages into state (blank bubbles, duplicate-key warnings). Check `res.success` before using `res.data.*`; surface the error text in-chat; same guard on history load (the canned welcome currently masks load failures).
  **Accept:** with backend stopped, sending a message shows a visible error bubble/toast — never a blank bubble.

**Phase 0 verification (whole batch):** `corepack yarn build` + eslint on touched files + `node --check` on touched backend files; browser pass over Home, AI Chat, Calendar, Workflow Manager, Settings-export with backend up **and** down.

---

## Phase 1 — Data integrity & consistency (~1 week)

- [x] **1.1 One source of truth for capture types + shared quick-form.**
  **Files:** new `src/constants/capture.ts` (export `CAPTURE_TYPES`: all 7 types with emoji/color); consume in `src/pages/CapturePage.tsx:8-16`, `src/pages/Dashboard/Home.tsx:167-178`, `src/components/QuickNotesPen.tsx:16-23`, `src/components/sage/SageStudio.tsx:53-56`, `src/components/VoiceTranscriber.tsx:23-29`. Optionally extract `<CaptureQuickForm>` for the three chip-picker surfaces.
  **Do:** delete the five local arrays; Home's quick bar gains compact type chips (today it hardcodes `type:'Idea'` — mislabels everything).
  **Accept:** `Article` selectable from every surface; grep finds exactly one `CAPTURE_TYPES` definition.

- [x] **1.2 Local-date utility (UTC off-by-one for IST users).**
  **Files:** new `src/utils/date.ts` (`localToday()` via `en-CA` locale or manual pad); replace `toISOString().slice(0,10)` in `src/pages/FinancePage.tsx:16`, `src/pages/CareerPage.tsx:11`, `src/pages/Dashboard/Home.tsx` (`todayISO`), `src/pages/HealthPage.tsx:17` (`toDate`), `src/pages/Calendar.tsx:65-73` (edit-prefill uses UTC date too).
  **Accept:** at a simulated 00:30 IST clock, a new transaction/health entry lands on the *local* date.

- [x] **1.3 Real habit streak.**
  **Files:** `backend/controllers/personal.js` (`getDashboardStats` ~262-280), `src/pages/Dashboard/Home.tsx:161,383-387`, `src/components/sage/SagePersona.tsx:58`
  **Do:** stats endpoint returns both `habitsDoneToday` and a true `habitStreak` (fetch last ~60 `Health` docs sorted desc, count consecutive days with ≥1 habit done). UI: ring = done-today over total; streak copy uses the real streak. Ring denominator comes from the habit count, not hardcoded `/6`.
  **Accept:** with seeded Health docs for 3 consecutive days, dashboard + Sage nudge both say 3-day streak.

- [x] **1.4 Error-handling sweep on bare mutation handlers.**
  **Files:** `src/pages/CareerPage.tsx:39-87` (8 handlers), `src/pages/SocialPage.tsx:50-101` (8 handlers, plus `load()` at 40 has no visible error state at all), `src/pages/Calendar.tsx` (covered by 0.8), `src/pages/WorkflowManagerPage.tsx:53-176` (7 console-only catches)
  **Do:** add a tiny shared helper (e.g. `notifyError(err, fallbackMsg)` using react-toastify) and wrap every mutation; give SocialPage a visible load-error banner.
  **Accept:** with backend stopped, every button click on those pages produces a visible toast, never silence.

- [x] **1.5 Task editing + resurrect the dead `dueDate` field.**
  **Files:** `src/pages/PersonalTasksPage.tsx` (add edit affordance + date input in add-form — currently always sends `dueDate: null` at line 66 and never renders it), `backend/models/Task.js` (field exists), controller already supports update.
  **Do:** inline edit (title/priority/area/tab/dueDate); render due date on rows with overdue highlight; delete gets an undo-toast or confirm.
  **Accept:** create → edit title + set due date → both persist after refresh; overdue task visibly flagged.

- [x] **1.6 Goal editing, milestone delete, slider debounce.**
  **Files:** `src/pages/GoalsPage.tsx` (modal 148-189; slider 167-168 fires a PUT per drag-tick; milestone handlers 52-70 build from stale click-time state)
  **Do:** editable title/area/emoji/deadline in modal; ✕ per milestone; debounce progress PUT (fire on release / 400ms); build milestone updates from latest state (functional update) to fix the double-toggle race; deadline renders "X days left / overdue", not raw string.
  **Accept:** drag slider end-to-end → ≤2 PUTs in network tab; rapid-toggle two milestones → both persist.

- [x] **1.7 Finance: wire the orphaned Budget feature + transaction edit.**
  **Files:** `src/pages/FinancePage.tsx:104-106` (hardcoded budget map), `src/services/personalApi.ts:70-74` (`budgetApi` — fully built, never imported), `backend/routes/personal.js:20-25` (budget routes exist; **add** `PUT /finance/:id`), `backend/controllers/personal.js` (add `updateTransaction`, user-scoped + whitelisted per 0.7)
  **Do:** Budget Overview reads/writes real budgets (editable limits per category, all 9 categories); transactions get an edit affordance; fix `formatINR` for negatives (`-₹1,500` not `₹-1,500`, line 17).
  **Accept:** set a Food budget of ₹4,000 → persists, spent-vs-limit bar reflects real transactions; edit a transaction amount → totals update.

- [x] **1.8 Knowledge edit UI (backend already supports it).**
  **Files:** `src/pages/KnowledgePage.tsx:142-181` (detail modal is read-only; `knowledgeApi.update` at `personalApi.ts:86` is dead code)
  **Do:** make title/content/tags/type editable in the modal, save via the existing update endpoint.
  **Accept:** edit a note's content → persists after refresh.

- [x] **1.9 Double-submit locks on the two unguarded capture forms.**
  **Files:** `src/pages/CapturePage.tsx:43-62,113,122`, `src/pages/Dashboard/Home.tsx:167-178`
  **Do:** `saving` flag + disabled button while POST in flight (copy the pattern from `QuickNotesPen.tsx:73-87`).
  **Accept:** double-clicking Save creates exactly one capture.

---

## Phase 2 — Honest modules (kill the fakes)

- [x] **2.1 Blogs → Reading Room (real data).**
  **Files:** `src/pages/BlogsPage.tsx` (full rewrite — currently a static `BLOGS` array at 21-89 with zero API calls), reuse `staffApi.listPosts` + `ingestApi.listSources/createSource/runSource/deleteSource` from `src/services/staff.api.ts`
  **Do:** list ingested `BlogPost`s (title/source/date/link, newest first, search + source filter); a "Sources" panel to add/pull/delete RSS feeds (same API Command Center uses — keep both surfaces); honest empty state ("Add your first feed") instead of fake articles.
  **Accept:** add a real RSS URL → pull → posts render from Mongo; the six fake articles are gone from the codebase.

- [x] **2.2 Workflow Manager honesty pass + real triage.**
  **Files:** `src/pages/WorkflowManagerPage.tsx` (connections panel 86-92, readiness 64-72, static "Success Blueprint" 194-203), `backend/services/automationService.js:59-77`, `backend/models/WorkflowQueueItem.js`
  **Do:** (a) label connections/automation "Simulation mode" with plain copy — toggles today have zero real integration behind them; (b) replace fake "Readiness %" with a simple checklist of what's actually configured; (c) make DM triage actually use `dmRules.leadKeywords`/`urgentKeywords` to categorize (today it bulk-flips `new→acknowledged` ignoring the rules the user typed); (d) add `postedAt`/`publishedUrl` fields to the schema (automation already writes `postedAt`, silently dropped by strict mode); (e) either render or delete the dead `browserWorkspace` config surface (modeled in `UserSettings.js:41-52`, typed in `personalApi.ts:277-288`, never rendered anywhere — **decision: delete** unless the user objects).
  **Accept:** a DM containing a lead keyword lands as `category:'lead'` after an automation run; queue items show a persisted postedAt.

- [x] **2.3 Settings truthfulness.**
  **Files:** `src/pages/SettingsPage.tsx:393-425`
  **Do:** replace the hardcoded "🟢 Atlas · cluster0.bacgamo…" badge with a live check against `GET /health` (green/red for real); remove the stale "Personal Space v3.0 — Phase 3 ✅" footer; export copy fixed in 0.3.
  **Accept:** stop the backend → Settings badge turns red without a refresh loop.

- [x] **2.4 Chat/Agent differentiation copy (pre-merge step).**
  **Files:** `src/components/PersonalSidebar.tsx`, `src/pages/AiChatPage.tsx`, `src/pages/AgentPage.tsx`
  **Do:** subtitle both pages honestly ("Chat — ask & talk" vs "Agent — acts on your data") + a cross-link banner on each. Also fix the misleading "Preview mode active" badge (`AiChatPage.tsx:39-54`) — the backend falls back to local Ollama, so absence of a cloud key ≠ preview.
  **Accept:** both pages state what they are and link to the other; badge reflects the actual provider cascade.

---

## Phase 3 — Power features on existing rails

- [x] **3.1 Merge assistants into one.**
  **Files:** `src/App.tsx` (route `/ai-chat` → redirect `/agent`), `src/pages/AgentPage.tsx`, `backend/services/agent/` (provider), `src/services/agent.api.ts`
  **Do:** Agent page becomes "Assistant": if the tool loop's provider (Ollama) is offline, fall back to plain chat via the existing Gemini/ChatGPT/Ollama cascade (`aiService.generateText`) so the page always answers; add a run-history drawer (`getAgentRuns` — built, never called: `agent.api.ts:113-123`) and a tools list (`getAgentTools`); pass a persistent `conversationId` (currently always `undefined` — `AgentPage.tsx:159-164`) so threads survive refresh; retire `AiChatPage` after parity.
  **Accept:** with Ollama stopped but a Gemini key set, the Assistant still answers; refresh preserves the conversation; a past run's tool trace is viewable in-app.

- [x] **3.2 Agent write-tools for the rest of the portal.**
  **Files:** `backend/services/agent/tools/` (new: `completeTask`, `createGoal`, `updateGoalProgress`, `logHealth`, `addCalendarEvent`, `addContact`) + register in `tools/index.js`; sync `TOOL_META` in `AgentPage.tsx:46-50` (already stale — missing `search_personal_context`)
  **Do:** follow the existing `defineTool` pattern (JSON Schema + Zod + ctx.userId scoping). Agent gains modify powers, not just create (today: create-only, 3 modules of 10).
  **Accept:** "mark my milk task done and log that I slept 8 hours" executes two tool calls visible in the timeline, and the records change.

- [x] **3.3 Calendar: timed events + drag-reschedule + overlays.**
  **Files:** `src/pages/Calendar.tsx` (allDay hardcoded `true` at 83; `interactionPlugin` loaded at 5,153 but `editable`/`eventDrop`/`eventResize` never wired; modal has date-only inputs 234-252), `backend/models/CalendarEvent.js` (start/end already strings — accept ISO datetimes)
  **Do:** allDay toggle + datetime-local inputs; wire `editable`, `eventDrop`, `eventResize` → `calendarApi.update`; overlay task `dueDate`s and goal `deadline`s as read-only background events linking to their pages.
  **Accept:** drag an event to another day → persists; a timed event renders correctly in week view; tasks with due dates appear on the calendar.

- [x] **3.4 Scheduler that actually fires on the deployed stack.**
  **Files:** new `netlify/functions/cron-brief.js` (Netlify Scheduled Function) **or** `.github/workflows/cron.yml` hitting `POST {PUBLIC_BASE_URL}/api/v1/staff/brief/run`, `/staff/review/run`, ghostwriter run — with a service token; update `docs/DEPLOYMENT.md` + the misleading "generates automatically at 7:00" copy in `CommandCenterPage.tsx:304` to state the real trigger
  **Do:** pick per deployment target: Docker tier keeps `ENABLE_SCHEDULER=true`; Netlify-only deploys get the scheduled function/GH-cron. Needs a simple auth mechanism for machine calls (e.g. `X-Service-Token` checked against env) since these routes currently require a user JWT.
  **Accept:** on the deployed environment, the morning brief exists by 07:05 IST without anyone clicking "Generate now".

- [x] **3.5 Portfolio completeness.**
  **Files:** `src/pages/PortfolioPage.tsx`, `src/pages/CommandCenterPage.tsx:412-416`
  **Do:** (a) delete-project button (API exists: `staff.api.ts:132`, `portfolio.js:61-66`); (b) decision-review workflow UI — set `reviewAt`, mark reviewed, record `outcome` (API exists: `portfolio.js:112-123`); (c) surface `tags` + `links.deploy/docs` on cards (schema fields exist, never rendered); (d) empty-state CTA linking to the GitHub importer; (e) an explicit "Register webhooks" button in Command Center calling `ingestApi.registerGithubWebhooks` (built, no UI trigger; current copy claims it's automatic — it isn't).
  **Accept:** a killed project can be deleted; a decision can be marked reviewed with an outcome; webhook registration returns per-repo results in a toast/panel.

- [x] **3.6 Permission catalog covers HQ + Portfolio.**
  **Files:** `backend/config.permissions.js`, `src/App.tsx:88-89` (currently gates `/hq` on `ai_chat` and `/portfolio` on `tasks`), `src/utils/featurePermissions.ts`
  **Do:** add `command_center` and `portfolio` permission ids; gate routes/sidebar with them; Permission Matrix picks them up automatically (renders from catalog).
  **Accept:** an admin can revoke Portfolio access for a role without touching Tasks access.

- [x] **3.7 Enforce `mustChangePassword`; hide 2FA until real.**
  **Files:** `backend/controllers/auth.js` (login flow), `backend/middleware/auth.js`, `src/pages/Admin/UserManagement.tsx:132-144`, existing `src/components/auth/SetPasswordPage.tsx`
  **Do:** on login (or via `protect`), if `accountConfig.mustChangePassword` → respond with a flag; frontend routes to SetPasswordPage and clears the flag on success. Remove/disable the 2FA checkbox with a "coming soon" note (currently stores a flag nothing reads).
  **Accept:** flagging a user forces the password screen on their next login; no inert security checkboxes remain.

---

## Phase 4 — Growth bets (independent; pick by appetite)

- [x] **4.1 Health trends & custom habits.** Range query endpoint (`GET /health?from=&to=`), mood/sleep/energy line charts + habit heatmap on `HealthPage`; move the hardcoded 6-habit list (`HealthPage.tsx:4-11`) into `UserSettings` so habits are user-defined. *Accept:* chart renders 30 days of seeded data; adding a custom habit shows a 7th toggle. ✅ `getHealthRange` + `healthApi.getRange`; energy/mood bars + habit-completion heatmap over 30 days; `UserSettings.habits[]` + Manage/add/remove UI (falls back to 6 defaults).
- [x] **4.2 Finance power.** Recurring transactions (schema `recurrence` + scheduler/cron materialization), date-range + category filters and pagination on the transaction list, CSV export button (client-side from fetched data or new endpoint), and either a real statement-import (CSV/UPI export parse) or **delete the "PhonePe import coming soon" copy** (`FinancePage.tsx:81`). *Accept:* a monthly rent recurrence auto-creates next month's row; export opens in a spreadsheet. ✅ `recurrence`/`recurringId`/`lastRun` on Finance; `materializeRecurring` seeds occurrences on read (idempotent, TZ-safe, cascade-delete); Recurring Rules section; category + from/to filters + Load-more; client-side CSV export; PhonePe copy removed.
- [x] **4.3 Contacts → real CRM-lite.** `interactions[]` on `Contact` schema (date + note per touch), form fields for the dead schema fields (`email`, `tags`, `socialLinks` — currently hardcoded blank at `SocialPage.tsx:52`), follow-up reminders via scheduler → `Notification` collection (bell icon already polls it). Fix `upsertPlatform` wiping `following` to 0 on every save (`SocialPage.tsx:90`) and write to the dead `snapshots[]` for follower trends. *Accept:* logging a touch updates lastTalked + history; an overdue follow-up produces a notification. ✅ `interactions[]` + expandable log UI (updates lastTalked); email/tags/socialLinks form fields; `services/followUps.js` + `contact-followups` scheduler job creating dedup'd Notifications. (`following:0` fixed in Phase 1; `snapshots[]` follower-trend deferred.)
- [x] **4.4 Capture lifecycle.** "Convert to Task / Goal / Event" actions on captures (+ `convertedTo` ref + `source` field on schema so entry-point analytics exist), archive/snooze, pagination on `getAll`. *Accept:* converting a capture creates the target record, links back, and archives the capture. ✅ `source`/`archivedAt`/`convertedTo` on Capture; row convert (task/goal/event) + archive actions; converted badge; Show-archived toggle + Load-more pagination.
- [ ] **4.5 Career pipeline.** Kanban board by status (drag between Applied/Interview/Offer/Rejected), persist AI job-match results against a `Job` (new `matches[]` or collection), CV file upload (multipart + pdf/docx text extraction) feeding the existing `processCv`, expose dead `Job.type`/`Job.url` + `location` inputs (form omits them — `CareerPage.tsx:200-222`), auto-derive cert `Expired` status from `expires` date. *Accept:* dragging a job card persists its status; a match report is still there after refresh.
- [ ] **4.6 Real Instagram/Drive integration (explicitly optional).** Meta Graph API OAuth + publish for the queue, Drive folder ingestion, webhook receiver for DMs; only then flip Workflow Manager out of simulation mode. Large scope (Meta app review, token storage/refresh). *Accept:* a queue item actually publishes to a test IG account.
- [ ] **4.7 Recurring events & reminders.** `recurrence` on `CalendarEvent`, reminder offsets → `Notification` via scheduler; goal-deadline reminders (Settings already has a dead `goalDeadlines` toggle — wire it). *Accept:* a weekly event renders on future weeks; a reminder notification fires at the offset.
- [ ] **4.8 Scale pass.** Pagination/limit-skip on unbounded `getAll`s (captures, finance, knowledge, admin users), text search endpoint for Knowledge (Mongo text index), conversation-list UI for the Assistant. *Accept:* list endpoints accept `?limit=50&skip=0` and UIs load-more.

---

## Phase 5 — Product-grade: make it a daily-use app (open-source powered)

Turn the portal from a website into a real product people open every day. Each pack is independently shippable and verified.

- [x] **5.1 Mobile app (PWA): installable + offline + push.** `vite-plugin-pwa` (Workbox) manifest + offline precache via a custom injectManifest service worker (`src/sw.ts`); `web-push` backend (VAPID) — `PushSubscription` model, `/personal/push/{vapid,subscribe,unsubscribe,test}` endpoints, `services/push.js` `sendToUser`; wired into `contact-followups` + new `habit-reminder` (21:00) scheduler jobs; **App & Notifications** card in Settings (install prompt + enable/test). *Accept:* installs to home screen, loads offline, a test push arrives; overdue-contact + un-logged-habit jobs push. ✅ built (SW `/sw.js`, manifest, 142 precached), 10/10 endpoint harness PASS, browser-verified SW registration + manifest + icons.
- [x] **5.2 Smart Capture (chrono-node NLP).** Natural-language parse of the capture box ("gym tomorrow 6am", "rent 15000 monthly 1st", "call Sam friday") → date/time/recurrence/amount extraction; smart-suggestion banner that one-tap creates the right record (event / task-with-due / recurring finance). *Accept:* typing a dated phrase offers the correct record type pre-filled. ✅ `utils/smartCapture.ts` (chrono-node + recurrence/amount/category detection, cleanText stripping); ✨ suggestion banner in `CapturePage` that creates event/task/recurring-finance in one tap. 8/8 parser cases pass.
- [x] **5.3 Focus & Streaks (pomodoro + gamification).** `FocusSession` model + `/focus` endpoints; Pomodoro timer page with task picker, session log, today's total; gamification (XP/level/streak/achievements) derived from real activity + a stats card. *Accept:* a completed focus session logs time; XP/level reflects real tasks/habits/focus. ✅ `FocusSession` + `/focus` CRUD + `/gamification` (XP from tasks/habits/goals/focus/captures/txns, level curve, habit+focus streaks, 10 achievements). `FocusPage` (`/focus` route + sidebar): ring Pomodoro (15/25/50 + break), task link, manual-log, session list, XP/level bar + achievements grid. 14/14 harness PASS.
- [ ] **5.4 Daily Rituals (morning/evening/weekly).** `DailyRitual` model + endpoints; guided morning-plan (top-3 priorities + today's tasks/events), evening reflection (wins/gratitude/tomorrow), weekly review aggregation. *Accept:* setting a morning plan persists; evening reflection saves; weekly view aggregates the week.

---

## Standing quality gates (every phase)

- `corepack yarn build` green; eslint clean on touched files (~115 pre-existing errors in untouched `src/services/*`/`src/types/*` are baseline — don't add to them); `node --check` on touched backend files.
- Every new mutation: user-scoped query (`userId: req.user._id`), field whitelist, null-result handled, visible error feedback in UI.
- Dark mode + Book skin sanity check on any restyled page.
- New entry in `docs/DEVELOPMENT_LOG.md` per session; tick checkboxes here in the same commit.
