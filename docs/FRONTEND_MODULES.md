# Frontend Modules

## Architecture
- Stack: React 18 + TypeScript + Vite
- Routing: `src/App.tsx`
- Layout shell: `src/layout/AppLayout.tsx`
- Auth/Permissions: `src/context/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`
- API layer: `src/services/*`

## Route Map (Current)

### Public
- `/signin` -> `src/pages/AuthPages/SignIn.tsx`
- `/signup` -> `src/pages/AuthPages/SignUp.tsx`
- `/admin/login` -> `src/pages/AuthPages/AdminSignIn.tsx`
- `/portal/signup` -> `src/pages/AuthPages/PortalSignUp.tsx`
- `/reset-password` -> `src/components/auth/ResetPasswordPage.tsx`
- `/set-password` -> `src/components/auth/SetPasswordPage.tsx`

### Protected (with feature permission)
- `/` -> Home
- `/capture` -> `tasks`
- `/personal-tasks` -> `tasks`
- `/calendar` -> `calendar`
- `/finance` -> `finance`
- `/knowledge` -> `tasks`
- `/goals` -> `tasks`
- `/health` -> `tasks`
- `/career` -> `tasks`
- `/social` -> `social`
- `/blogs` -> `blogs`
- `/workflow-manager` -> `social`
- `/ai-chat` -> `ai_chat`
- `/settings` -> `tasks`
- `/profile` -> `tasks`

### Protected Admin
- `/admin/users` -> roles: `owner|admin`, permission: `user_management`
- `/admin/permission-matrix` -> roles: `owner|admin`, permission: `user_management`

## Core Feature Pages
- Home: daily snapshot + quick actions
- Capture: quick notes/tasks + voice capture entry
- Workflow Manager: integrations config + queue + DM activity
- User Management: users, roles, permission modes, account config, activity trace
- Permission Matrix: role-permission matrix + bulk controls

## Voice Capture Module
- Component: `src/components/VoiceTranscriber.tsx`
- Entry point: `src/pages/CapturePage.tsx`
- Capabilities:
  - start/pause/resume/stop
  - transcript draft recovery
  - language selector
  - mic level + duration + word count
  - raw capture save, optional AI refinement

## Service Layer
- `src/services/personalApi.ts`: personal module APIs (capture/tasks/finance/goals/etc.)
- `src/services/adminService.ts`: user/role/analytics/activity APIs
- `src/services/authService.ts`: sign-in/up, token/session handling
- `src/services/aiIntelligence.ts`: AI enhancement endpoints

## Permission Gating Rules
- UI visibility: sidebar filtered by feature permission map
- Route protection: `ProtectedRoute` with `requiredPermission`
- Auth context capability: `hasFeatureAccess(permissionId)`

## Frontend Change Checklist
1. Route added? Update `src/App.tsx` and this doc.
2. New feature permission? Update permission map and sidebar gating.
3. API contract changed? Update service type interfaces.
4. UX flow changed? Update `PRODUCT_FLOWS.md`.
