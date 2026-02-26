# Product Flows

## 1) Sign-In and Access Resolution
1. User signs in via `/api/v1/auth/sign-in`.
2. Backend returns user + effective permissions + account config.
3. Frontend stores session in `AuthContext`.
4. Sidebar and routes are filtered by `hasFeatureAccess`.

## 2) Capture Flow (Text + Voice)
1. User opens Capture page.
2. User enters quick text capture or opens voice transcriber.
3. Voice flow:
- start/pause/resume/stop recording
- transcript draft persists locally during session
- raw transcript saved to Capture on stop
- optional AI refinement updates saved capture text
4. Capture list refreshes in reverse chronological order.

## 3) Admin User Management Flow
1. Admin opens `/admin/users`.
2. Loads users, roles, permission catalog, analytics, and activity logs.
3. Admin updates user role/permission mode/account config.
4. Backend logs admin action in `AdminActivity`.
5. User access updates are reflected in UI route/menu permissions.

## 4) Permission Matrix Flow
1. Admin opens `/admin/permission-matrix`.
2. Role x permission matrix loaded from role definitions.
3. Admin applies bulk/category/individual toggles.
4. Save updates role permissions.
5. Users in role mode inherit updated permissions.

## 5) Workflow Manager Social Ops Flow
1. Configure connections (Instagram, Drive, Caption Engine).
2. Set IO points and DM rules.
3. Create/manage queue items and DM activity.
4. Use queue + DM insights for social execution.

## 6) Browser Bridge Flow (Optional)
1. Run Python bridge service locally.
2. Workflow-oriented modules call `/health`, `/preview`, `/search` where needed.
3. UI displays rendered text/screenshot/top links in portal.
4. If bridge is down, diagnostics show connection failure and fallback paths.

## 7) Settings and Persistence Flow
1. User updates profile/preferences/integrations/settings.
2. Saved in `UserSettings`.
3. Modules read settings for behavior toggles and integrations.

## Operational Notes
- Any route/permission change must update `FRONTEND_MODULES.md` and `BACKEND_MODULES.md`.
- Any user journey change must update this flow doc and BRD if requirement-impacting.
