# Backend Modules

## Architecture
- Stack: Node.js + Express + MongoDB + Mongoose
- Entry: `backend/server.js`
- Auth middleware: `backend/middleware/auth.js`

## Route Mounts
- `/api/v1/auth` -> `backend/routes/auth.js`
- `/api/v1/personal` -> `backend/routes/personal.js` (protected)
- `/api/v1/admin` -> `backend/routes/admin.js` (protected + role-authorized)
- `/api/v1/chat` -> `backend/routes/chat.js`
- `/api/v1/notifications` -> `backend/routes/notification.js`

## Auth Module
- Controller: `backend/controllers/auth.js`
- Flows:
  - `POST /sign-up`
  - `POST /sign-in`
- Sign-in resolves effective permissions and account config.

## Personal Module
- Route file: `backend/routes/personal.js`
- Controller: `backend/controllers/personal.js`

### Domain groups
- Captures
- Tasks (+ analysis)
- Finance + Budgets
- Knowledge (+ summarization)
- Goals
- Health
- Journal
- Career (profile/jobs/certs/skills)
- Social (contacts/ideas/platforms)
- Calendar events
- Workflow manager (config/queue/dm-activity)
- Settings
- Intelligence (dashboard/refine)
- Export

## Admin Module
- Route file: `backend/routes/admin.js`
- Controller: `backend/controllers/admin.js`
- Includes:
  - user lifecycle (status/role/permissions/account config)
  - role CRUD + permission validation
  - permission catalog
  - analytics + activity logs

## Key Data Models
- Core: `User`, `Role`, `AdminActivity`
- Productivity: `Capture`, `Task`, `Goal`, `Knowledge`, `Health`, `Journal`
- Operations: `CalendarEvent`, `WorkflowQueueItem`, `WorkflowDMActivity`, `UserSettings`
- Social/Career: `Contact`, `ContentIdea`, `SocialPlatform`, `Job`, `Certification`, `Skill`, `CareerProfile`

## Config Surfaces
- Permission catalog: `backend/config.permissions.js`
- Workflow settings defaults include `browserWorkspace` config.

## Security Rules
- JWT required for personal/admin APIs
- Admin routes require role: `owner` or `admin`
- Permission checks support `role` and `custom` permission modes
- Account block/loginAccess enforcement in auth middleware

## Backend Change Checklist
1. Add model? Document under Key Data Models.
2. Add route? Document endpoint and owning controller.
3. Change permission behavior? Update Security Rules and product flows.
4. Add workflow setting keys? Update both backend + frontend config types + docs.
