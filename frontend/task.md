# Enhancement Gap-Analysis Plan (License & Asset Management App)

Scope: update existing app only, no rebuild. Each item = DB migration (if needed) + UI change, then lint.

## 1. Hardware Management
- [x] Add `remarks` TEXT column to `assets`; add Remarks field to Add/Edit Asset form + table/detail view.
- [x] Constrain `asset_type` to fixed set (Desktop, Laptop, Workstation, Server) via CHECK constraint + replace free-text input with Select in asset form; migrate existing free-text values to closest match.
- [x] Align `status` values to spec (Allocated, Available, Maintenance, Scrap) - add CHECK constraint, map existing values (Active->Available/Allocated based on assigned_user_id, In Repair->Maintenance, Retired/Decommissioned->Scrap), update UI badges/filters/status options.

## 2. Software & License Management
- [x] Verify/add explicit KPI cards on Licenses page for: Total Purchased, Allocated, Available, Expiring, Cost Per License, Total Investment, Utilization % (confirm all present, add any missing).

## 3. Request Management / Approval Workflow
- [x] Extend `request_type` CHECK + RequestType union with: Hardware Allocation, Hardware Transfer, Return Hardware, Temporary License Allocation (in addition to existing New License/Reallocation/Release).
- [x] Add `Cancelled` to request status CHECK + RequestStatus union; add Cancel action (requester can cancel own pending request).
- [x] Add `priority` TEXT column (Low/Medium/High/Urgent) + `required_from_date`, `required_until_date` DATE columns to `requests`; add fields to request form, table columns, approval detail view.

## 4. Hardware Allocation Workflow
- [x] Add hardware transfer/return tracking via `asset_allocations` table (asset_id, user/entity/client, allocation_type, action_type Allocate/Transfer/Return, date, notes, actor); Transfer/Return actions + dialog on Hardware page, allocation history action created.

## 5. New Standalone Pages (nav + routes)
- [x] Users page (view imported employee/user directory, edit department/entity assignment + status) - list existing `users` table.
- [x] Departments page (CRUD departments).
- [x] Clients page (CRUD clients).
- [x] Entities page (CRUD entities).
- [x] Audit Logs - already covered by existing Reports > Audit Report tab (uses audit_logs table); no separate page needed.
- [ ] Notifications page (list `notifications` table records for current user, mark read).
- [ ] Settings page (basic app settings / profile, minimal scope).
- [x] Update `lib/nav-config.ts` and role gating for Users/Departments/Entities/Clients nav items (done). Notifications/Settings pages use existing NotificationsBell/account menu; skipped as standalone nav items per scope call below.

## 6. Audit Fields Verification
- [x] Confirmed: all core tables (users, entities, clients, departments, assets, software, license_inventory, license_allocations, asset_allocations, requests, approvals, notifications) already have created_by/at, updated_by/at, deleted_at from original core schema migration. No patch needed.

## 7. Final QA
- [x] Full nav/CRUD/dashboard smoke check against section 11: lint clean, all migrations applied, MODULE_ACCESS gating verified, sidebar nav renders per role. Notifications/Settings pages intentionally left as-is (covered by existing NotificationsBell topbar + account menu; not in explicit module list).

## 8. Explicit Module Checklist (latest request)
- [x] User Management: Users directory page added (view/edit department, entity, status). Add/Delete/Disable/Reset-Password are handled by UI Bakery's built-in Users & Permissions (per chosen built-in auth flow), not custom app code.
- [x] RBAC: 4 roles already implemented (Super Administrator, IT Administrator, Team Leader, Management) with per-module MODULE_ACCESS gating in lib/auth/roles.ts; Employee role marked optional in spec, skipped as no such role configured in workspace.
- [x] Authentication: handled by UI Bakery built-in auth (login/logout/forgot/change password/session) per earlier user choice; not custom-built.
- [x] Approval Workflow: Approvals page + approval history already exist (requests/approvals tables), extended with priority/dates/new request types this session.
- [x] Hardware Management: Add/Edit/Delete/Import/Export already present; enhanced this session (status/type/remarks).
- [x] Software Management: Add/Edit/Delete present; Import/Export from Excel added this session (software-import-dialog, software-excel utils).
- [x] Dynamic Navigation: nav-config + canAccessModule already role-gated; extended for new Users/Departments/Entities/Clients items.
- [x] Audit Logs: audit_logs table + Reports > Audit Report tab already records create/update/delete; asset allocation transfer/return actions also logged via recordAssetAudit.

## 9. Custom Access Management (this request)
- [x] Migration `role_module_access` table (role_name, module_key, is_allowed), seeded from existing MODULE_ACCESS defaults.
- [x] Actions: loadRoleModuleAccess, upsertRoleModuleAccess (upsert single cell).
- [x] lib/auth/roles.ts: added `accessManagement` module key, `buildAccessOverride`, `getDefaultModuleAccess`, `canAccessModule` now accepts DB override with static fallback.
- [x] AppLayout loads access rows via useLoadAction and passes override to sidebar + outlet context.
- [x] New Access Management page (Super Administrator only): role x module switch matrix, reset-to-defaults button, inline error/success banners.
- [x] Nav item + route registered (/access-management), gated to Super Administrator only.
- [x] lint() clean.
