# PPS Asset Scanner (mobile)

A React Native / Expo companion app for the existing PPS License Manager /
PPS Asset Management system. It lets IT staff and employees scan an asset's
QR/barcode label with a phone and view, transfer, or audit that asset —
against the **existing backend and database**. This app has no database of
its own and is never the system of record; every read and write goes
through the existing ASP.NET Core API in `backend/PPS.LicenseManager.API`.

```
Mobile App (this project)
      │  HTTPS REST (JSON, JWT bearer)
      ▼
Existing PPS Backend  (backend/PPS.LicenseManager.API)
      │  EF Core / Npgsql
      ▼
Existing PostgreSQL database
```

The mobile app never talks to Postgres directly, never receives database
credentials, and never hard-codes production secrets. It authenticates
against the same `/Auth/login` endpoint and JWT scheme the existing React
web app (`frontend/`) uses — there is no second authentication system.

## What's new vs. what's reused

Almost everything this app needs already existed in the backend. Two
small additions were made; everything else below reuses an existing
endpoint exactly as-is.

| Mobile feature | Backend endpoint | Status |
|---|---|---|
| Login | `POST /Auth/login` | Reused, unchanged |
| Dashboard / pending audits | `GET /AssetAudit?status=InProgress` | New (see below) |
| Scan → asset lookup | `GET /Asset/by-code/{code}` | **New** — exact-match by AssetTag/SerialNumber |
| Asset details | `GET /Asset/{id}/full-detail` | Reused, unchanged |
| Manual search | `GET /Asset/list` | Reused, unchanged |
| Transfer / assign / return | `POST /AssetAssignment/{assign,transfer,return}` | Reused, unchanged |
| Assignment history | `GET /AssetAssignment/asset/{id}/history` | Reused, unchanged |
| Audit: start / scan / complete / list | `POST /AssetAudit/*`, `GET /AssetAudit*` | **New module** (see below) |
| Location / department / user lookups | `GET /OfficeLocation`, `GET /Department`, `GET /Users` | Reused, unchanged |
| Add Asset | `POST /Asset` | Reused, unchanged — same action the web app's Asset Management form already calls |

### Backend change 1 — `GET /Asset/by-code/{code}`

The existing `GET /Asset/list?search=` does a `Contains` match across
several columns — perfect for a human typing into a search box, wrong for
a scanner that just read an exact code off a label (a substring match
could resolve `"AST-001"` to `"AST-0010"`). The new endpoint does an
exact, case-insensitive match: `AssetTag` first (it already has a unique
index), then `SerialNumber` only if it uniquely identifies one active
asset. It returns the same `AssetFullDetailResponse` shape as the
existing `/Asset/{id}/full-detail`, wrapped in the standard
`ApiResponse<T>` envelope. No new tables, no changes to existing asset
behavior or the web UI.

Files: `AssetController.GetByCode`, `AssetService.GetFullDetailByCodeAsync`,
`IAssetService`.

### Backend change 2 — Asset Audit module

Nothing like a physical audit / stocktake session existed before. This
adds one, modeled directly on the existing `AssetReallocationRequest`
module's conventions (same authorization pattern, same error-mapping,
same DI/controller/service layering):

- **`AssetAudit`** — one row per audit session (a Location, optional
  Department, who started/completed it, and running Found/Missing/
  Unexpected counts).
- **`AssetAuditItem`** — one row per asset the session cares about: every
  asset expected at that Location/Department when the session started
  (snapshotted, so the "expected" count is real data, not a live query
  that could change mid-audit), plus any *unexpected* asset scanned
  during the session that wasn't on the original list.

Starting a session snapshots the expected assets. Each scan during the
session either marks an expected item **Found**, or — if the scanned
asset wasn't expected at all — records it as **Unexpected** (location
unknown) or **WrongLocation** (the asset's own records place it
somewhere else). Completing a session finalizes counts; anything never
scanned stays **Missing**. None of this touches `Asset`'s own columns —
an audit is a separate, append-only record of what was observed, exactly
as a physical stocktake should be. Scanning a QR code never silently
changes an asset's official location, owner, or status.

`start` / `scan` / `complete` are restricted to `Super Admin` and
`IT Admin` server-side (`[Authorize(Roles = "Super Admin,IT Admin")]`),
matching every other asset-mutating endpoint in the system — the mobile
app's UI hides these actions from other roles, but the server is the
actual authority.

Files: `Models/AssetAudit.cs`, `Models/AssetAuditItem.cs`,
`Controllers/AssetAuditController.cs`, `Services/AssetAuditService.cs`,
`Interfaces/IAssetAuditService.cs`, `DTOs/AssetAudit/*.cs`, migration
`20260815120000_AddAssetAuditModule`.

**Migration:** applies automatically on next backend startup via the
existing `Database.MigrateAsync()` call in `Data/DbSeeder.cs` — the same
mechanism every other migration in this project already uses. No manual
SQL required. It only *adds* two new tables; it does not alter, rename,
or drop anything existing.

### Add Asset — zero backend change

`app/(app)/asset/new.tsx` lets field staff log a newly-arrived asset
without a desktop, by calling the **existing** `POST /Asset` the web
app's own Asset Management "Create" form already uses
(`AssetController.Create` / `AssetService.CreateAsync`) — no new
endpoint, no second place assets get created from, no second database.

It's deliberately a narrower form than the web app's: only `AssetTag`,
`AssetName`, `AssetType`, and `Department` are required (matching the
backend DTO's own `[Required]` fields exactly), with Manufacturer,
Model, Serial Number, and Remarks as optional quick-entry fields.
Anything not on this screen (host name, specs, purchase/warranty
dates) can still be filled in later from the existing web form —
this isn't meant to replace it, just to close the "the asset physically
arrived before anyone got to a desktop" gap.

`AssetTag` uniqueness is enforced entirely server-side, same as the web
app: a duplicate tag returns a 400 with a real message ("Asset Tag 'X'
already exists.") that the app surfaces as-is, never re-validated or
guessed at client-side.

Reachable from three places, each pre-filling `AssetTag` where it
already has a candidate value: the dashboard's "Add Asset" quick action
(blank form), Scan's "not found" result ("Add as New Asset", pre-filled
with the scanned code), and Search's empty-result state (pre-filled
with the search text). All three are gated to `Super Admin`/`IT Admin`
in the UI via `canManageAssets()` — see "Permissions / RBAC" below for
why that's a UI convenience here, not a real security boundary, since
`POST /Asset` itself only requires being authenticated, same as it does
for the web app today.

Files: `app/(app)/asset/new.tsx`, `src/lib/asset-form.ts` (the
validation schema + web-app-mirrored fixed `AssetType` list),
`src/api/assets.ts`'s `createAsset()`, `CreateAssetRequest` in
`src/types/api.ts`.

## Requirements

- Node.js 18+ and npm
- The [Expo Go](https://expo.dev/go) app (for the fastest path to a
  physical device) or Android Studio / Xcode if you want a custom dev
  client or a real build
- The existing PPS backend, reachable over the network from your phone
  (see "Connecting to the backend" below — `localhost` will **not** work
  from a physical device)

## Install

```bash
cd mobile
npm install
cp .env.example .env
# edit .env - see "Connecting to the backend" below
npx expo start
```

Scan the QR code Expo prints with the Expo Go app (Android) or the
Camera app (iOS), or press `a` / `i` in the terminal to launch an
emulator.

## Connecting to the backend

Set `EXPO_PUBLIC_API_URL` in `.env` to your backend's `/api` base URL.
**"localhost" refers to the phone itself**, not your computer:

| Where the app runs | Correct value |
|---|---|
| Android emulator | `http://10.0.2.2:8080/api` |
| iOS simulator | `http://localhost:8080/api` (the simulator shares the host's network) |
| Physical phone (same Wi-Fi as your dev machine) | `http://<your-computer's-LAN-IP>:8080/api`, e.g. `http://192.168.1.50:8080/api` |
| Physical phone over the internet | The deployment's public address, e.g. `http://98.93.56.145:8080/api` — matching how the existing web app is reached |

This app talks over plain HTTP in this deployment because the existing
backend (see `docker-compose.yml`) is not currently served over TLS
either. If/when the backend is put behind HTTPS, update
`EXPO_PUBLIC_API_URL` accordingly — the app itself has no HTTP-only
assumption baked in beyond whatever URL you give it.

### Environments

`.env.example` documents Development / Staging / Production blocks. Copy
the one you need into `.env` (or `.env.staging` / `.env.production` if
you're wiring up EAS Build profiles) before starting the app or
producing a build. `EXPO_PUBLIC_API_ENV_NAME` is shown on the
Profile screen so a tester can confirm which backend they're pointed at
— never commit a filled-in `.env*` file; only `.env.example` is tracked.

## Authentication

Reuses the existing `/Auth/login` endpoint and JWT exactly as issued —
there is no second login system. The token is stored in the device's
secure enclave (iOS Keychain / Android Keystore via `expo-secure-store`),
never in plain-text storage. On cold start, a previously-stored session
is restored automatically if its embedded expiration hasn't passed; if it
has, the app clears it and returns to the Login screen rather than
attempting a stale token. The existing backend has no refresh-token
endpoint, so a session simply expires 60 minutes after login (matching
the web app) — any API call made after that returns 401, which the app
treats as "session expired" and returns to Login with a message, rather
than showing a raw error.

## QR / barcode format

The scanner (`src/lib/qr-parser.ts`) accepts two shapes without assuming
either is "the" format this deployment prints on its labels — `AssetTag`
in this system is free text (e.g. `AST-0001`), not a fixed pattern:

- **A bare code**, e.g. `AST-0001`
- **A URL ending in a code**, e.g. `https://asset.example.com/a/AST-0001`
  (the last path segment is extracted and URL-decoded)

Anything that looks like a different kind of QR payload — a WiFi config,
a vCard, a `mailto:`/`tel:`/`sms:` link — is rejected outright rather than
mangled into a garbage asset code. Whatever the code turns out to be, it
is validated (length, character set) *before* it's ever sent to the API;
a scanned value is untrusted input like any other. The resolved code is
looked up via `GET /Asset/by-code/{code}` — an exact match, never a
fuzzy search — so scanning never accidentally opens the wrong asset.

If your printed labels use a different scheme entirely, `parseQRCode()`
is the one place to extend.

## Offline behavior

The only operation that queues while offline is **recording an audit
scan** (`app/(app)/audit/[id].tsx`) — the one workflow the spec calls out
as needing to keep working with no signal (e.g. a warehouse basement).
Everything else (login, asset lookup, Transfer) requires connectivity,
since Transfer needs a live server decision on permissions and Asset
lookup has nothing useful to show without the backend.

Queued scans live in `src/lib/sync-queue.ts` (AsyncStorage, not
SecureStore — this is non-secret, potentially-growing data): each item
tracks `PENDING → SYNCING → SYNCED`, or `FAILED` with a preserved error
message and a retry count. A failed item is **never silently dropped** —
it stays in the queue until it syncs or the user clears it. The app
auto-syncs when connectivity returns, and a "Sync Now" button lets a user
retry manually from the audit session screen or the Profile screen at
any time.

Recent Scans (`src/lib/recent-scans.ts`) is a separate, much simpler
local list — just enough to show "what did I scan recently" — capped at
50 entries and never treated as authoritative; tapping an entry re-fetches
the asset live.

## Permissions / RBAC

The mobile app mirrors the existing single-role-per-user model
(`ClaimTypes.Role` in the JWT) and gates its own UI the same way the
backend gates the underlying endpoints: Transfer and every Audit action
(`start`/`scan`/`complete`) are offered only to `Super Admin` and
`IT Admin` (`canManageAssets()` in `src/lib/auth-context.tsx`). For those
two features, this is a UI convenience, not a security boundary — the
server independently enforces the same roles on every one of those
endpoints, so a modified or compromised client still can't do anything
the account isn't actually allowed to do.

**Add Asset is the one exception.** `POST /Asset` predates this project
and only requires `[Authorize]` (any authenticated user) — there's no
`[Authorize(Roles = "...")]` on `AssetController.Create` today, and this
is true for the web app's own Create button too, not something this app
introduced. The mobile UI still gates its "Add Asset" entry points to
`canManageAssets()` for consistency with the rest of the app, but unlike
Transfer/Audit, a client that skipped that UI check (or called the API
directly) could currently create assets as any authenticated role.
Tightening `AssetController.Create` server-side would fix this for both
the web and mobile apps at once, but is a change to existing, unrelated
backend behavior — out of scope for this app to make unilaterally.
Worth deciding on explicitly rather than assuming it's already covered.

## Project layout

```
mobile/
  app/                      Expo Router screens (file-based routing)
    login.tsx
    (app)/                  Everything behind the auth guard
      dashboard.tsx
      scan.tsx              QR scanner
      search.tsx            Manual asset search
      recent-scans.tsx
      profile.tsx
      asset/new.tsx          Add Asset (quick entry, reuses POST /Asset)
      asset/[id].tsx        Asset details
      asset/[id]/transfer.tsx
      audit/index.tsx       Start / browse audit sessions
      audit/[id].tsx        Active session: scan loop, results, complete
  src/
    api/                    One file per backend resource; thin fetch wrappers
    lib/                    auth-context, qr-parser, sync-queue, recent-scans,
                             secure-storage, network, env
    components/             Shared UI primitives (Panel, StatusPill, buttons…)
    theme/                  Colors ported from the web app's Nova design tokens
    types/                  TypeScript types mirroring the backend's DTOs
  __tests__/
  app.config.ts             Reads EXPO_PUBLIC_* env vars into Expo's `extra`
  .env.example
```

## Testing

```bash
npm test
```

Covers the logic that doesn't require a running device or backend:

- `qr-parser.test.ts` — every accepted/rejected QR payload shape
- `client.test.ts` — the HTTP-status → friendly-message mapping every
  screen's error states are built on (400/401/403/404/409/422/500,
  timeout, offline), plus the `ApiResponse<T>` unwrap helper
- `sync-queue.test.ts` — offline queue: enqueue, sync success, sync
  failure (item stays queued with its error, never dropped), retry,
  no-double-send
- `auth-context.test.tsx` — sign in (valid/invalid credentials), session
  restoration on cold start (valid vs. already-expired), sign out, and
  the `canManageAssets` role gate
- `asset-form.test.ts` — the Add Asset screen's validation schema
  (required vs. optional fields matching `CreateAssetRequest` exactly,
  the fixed `AssetType` set, Asset Tag length) and the blank-optional-
  field-to-`undefined` mapping used before every `createAsset()` call

**Known limitation:** these are unit tests, not full component/screen
tests — testing a screen like Transfer or the Audit scan loop end-to-end
would require mocking Expo Router, the camera module, and React Query
together, which is real but substantially heavier scaffolding. Every
non-UI decision point those screens depend on (QR parsing, error
mapping, auth/session lifecycle, offline queueing, the exact backend
contract in `src/types/api.ts`) is covered directly instead. Physical
device testing (below) is what actually exercises the full screens.

## Physical device testing checklist

1. `npx expo start`, then open the project in Expo Go on an Android
   phone on the same Wi-Fi as your dev machine (or use a build — see
   below — for camera features that need a custom dev client).
2. **Camera permission** — first visit to the Scan tab should prompt for
   camera access; deny it once to confirm the "Grant Camera Access" /
   "Search Manually Instead" fallback appears, then grant it from device
   Settings and confirm the scanner starts working.
3. **Real QR sticker** — print or display a QR code containing a real
   `AssetTag` from your database (or a URL ending in one) and scan it;
   confirm it opens the correct asset's details.
4. **Wi-Fi / mobile network** — confirm `EXPO_PUBLIC_API_URL` is reachable
   from the phone's network (test with the phone's browser first if the
   app can't connect — `localhost` will not work here, see above).
5. **Offline scanning** — start an audit session, put the phone in
   Airplane Mode, scan a few labels, confirm each shows as "queued"
   with a running pending count; turn Wi-Fi back on and confirm they
   sync automatically (and that the audit's live counts update).
6. **Sync retry** — kill the backend briefly while queued items are
   syncing, confirm a failed item stays in the queue with a visible
   error instead of disappearing, and that "Sync Now" retries it once
   the backend is back.
7. **Transfer** — as a Super Admin/IT Admin user, transfer an asset to a
   different employee and confirm it appears correctly in the existing
   web app's assignment history; as an Employee-role user, confirm the
   Transfer/Audit actions are hidden.
8. **Audit** — start a session for a real location, confirm the expected
   count matches what you'd expect from the existing web app's asset
   list for that location, scan through several assets (including one
   deliberately *not* expected there, to see "Unexpected"/"WrongLocation"
   appear), then Complete and confirm final counts.
9. **Add Asset** — as a Super Admin/IT Admin, scan a code with no match
   (or search one), confirm "Add as New Asset" appears with the code
   pre-filled, submit with a department selected, and confirm the new
   asset opens and also appears in the existing web app's Asset list.
   Try submitting a duplicate `AssetTag` and confirm the "already
   exists" error surfaces correctly. As an Employee-role user, confirm
   the Add Asset entry points (dashboard, Scan, Search) are hidden.

## App icon / splash

`assets/icon.png`, `assets/adaptive-icon.png`, and `assets/splash.png` are
placeholders (a plain Nova-blue "PPS" mark) so `app.config.ts`'s asset
references resolve and the app runs out of the box. Swap them for the
real PPS brand assets before shipping a build to a store or to end users.

## Building

For a store-distributable build (or a custom dev client with native
camera/secure-storage modules that Expo Go alone won't cover), use
[EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

Set `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_API_ENV_NAME` for each EAS Build
profile (`eas.json`) rather than relying on a local `.env` file, so a
Production build can never accidentally point at a Development backend.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "EXPO_PUBLIC_API_URL is not set" on launch | `.env` wasn't created/filled in — see Install above |
| App can't reach the backend at all | Using `localhost` from a physical device (see table above), or the backend/CORS/firewall isn't reachable from the phone's network |
| Every API call returns "session has expired" immediately after login | Backend and phone clocks are far apart (the JWT expiration check is time-based), or the backend's JWT signing key changed since the token was issued |
| Camera screen is blank / permission prompt never appears | Camera permission was permanently denied previously — enable it from the OS Settings app for Expo Go / this app |
| A scan says "Asset not found" for a code you know exists | The QR encodes something other than an exact `AssetTag`/`SerialNumber` match (e.g. a typo, or a different ID scheme) — check what's actually encoded against `src/lib/qr-parser.ts`'s supported formats |
| Transfer/Audit buttons don't appear | Expected for any role other than Super Admin/IT Admin — this matches the backend's own authorization, not a bug |
