# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **In flight:** the `feature/ui-redesign` branch is migrating the front from the current look to a new dark UI based on the `HeyMozo Mockup` project. The plan lives in [UI_MIGRATION.md](UI_MIGRATION.md) and the source-of-truth for the mockup is [MOCKUP_HANDOFF.md](MOCKUP_HANDOFF.md). Read both before touching `UserScreen`, `AdminScreen`, or related styles.

---

## Development commands

- `npm run dev` — React frontend (port 3000) + Express backend (port 3001) concurrently.
- `npm start` — production Express server only (serves the built React app).
- `npm run server` — Express backend only.
- `npm run build` — production React build.
- `npm test` — React test suite (CRA Jest).
- `npm run seed` — seed the database with initial data.
- `npm run migrate` — run Sequelize migrations.

The React dev server proxies to port 3001 (see `package.json` proxy field).

---

## High-level architecture

Restaurant table management. Customers scan a QR code on their table and request things from staff (call waiter, ask for the check, etc.). Staff sees those requests in real time on an admin dashboard.

- **Frontend**: React 18 SPA (CRA), React Router 6, plain CSS per component (no Tailwind, no CSS-in-JS).
- **Backend**: Express + Sequelize ORM over PostgreSQL.
- **Realtime**: client-side polling every **6 seconds**, no WebSocket.
- **Auth**: passwordless magic links via Resend → JWT (7d) stored in `localStorage`.
- **PDF**: QR codes generated with `@react-pdf/renderer`.
- **Notifications**: browser audio plays a sound when unseen-event count increases.

---

## Data models

Files under [src/models/](src/models/). Sequelize associations are wired in [src/models/index.js](src/models/index.js).

| Model | Purpose | Soft-delete |
|---|---|---|
| `Company` | Restaurant chain. Owns event types and branches. Fields: `name`, `website`, `menu`, `branchIds (JSON)`. | yes |
| `Branch` | Restaurant location. Owns tables and branding (`logo`, `textColor`, `fontFamily`, `qrBackgroundImage`). | yes |
| `Table` | Physical table. Fields: `tableName`, `branchId`, `tableDescription`. | yes |
| `Event` | A request or state change on a table. Fields: `tableId`, `eventTypeId`, `type` (legacy string), `message`, `seenAt`. | no |
| `EventType` | A type of event configured per company. Drives both customer-facing buttons and admin-facing states. See "Event system" below. | yes |
| `EventConfiguration` | Per-resource override (`resourceType: company \| branch \| location`) of an `EventType`. Null override fields = inherit. | no |
| `User` | Staff user. Email + `isAdmin` flag. No password. | yes |
| `Permission` | Per-user access grant. `resourceType: company \| branch \| table`, `permissionLevel: view \| edit`. Unique on `(userId, resourceType, resourceId)`. | yes |
| `AuthToken` | Magic-link token. 64-hex string, 15-min expiry, `used` flag. | yes |
| `MailingList` | Landing-page contact form submissions. | no |

### Relationships
- `Company` → `Branch` → `Table` → `Event` (hierarchical).
- `Company` → `EventType` (a company owns its event catalog).
- `EventType` ← `EventConfiguration` → polymorphic to `Company` / `Branch` / `Table`.
- `User` ↔ `Permission` (one-to-many; permissions are flat rows checked hierarchically).
- `User` → `AuthToken` (one-to-many).

---

## Event system (read this — it's the most non-obvious part)

There are **two coexisting systems** because of an in-progress migration:

### Legacy (still present for backward compat)
`Event.type` is a string column. Values come from [src/constants.js](src/constants.js): `SCAN`, `CALL_WAITER`, `REQUEST_CHECK`, `MARK_SEEN`, `MARK_AVAILABLE`, `MARK_OCCUPIED`, `CALL_MANAGER`. Some old code paths still write this field; new code reads `eventTypeId` instead.

### Current (`EventType` + `EventConfiguration`)
`Event.eventTypeId` points to an `EventType` row owned by a company.

**`EventType` fields** ([src/models/EventType.js](src/models/EventType.js)):
- `companyId`, `eventName`, `stateName` — what to show.
- `userColor`, `userFontColor`, `userIcon` — what the customer sees on their button.
- `adminColor`, `priority` (0–100) — how it renders on the staff dashboard.
- `systemEventType` — ENUM `SCAN | MARK_SEEN | OCCUPY | VACATE`, nullable. These four are **system events**: they cannot be deleted (`beforeDestroy` hook throws) and the `systemEventType` field cannot be changed (`beforeUpdate` hook throws). A partial-unique index ensures each company has at most one of each system type.
- `isDefault`, `isActive`.

**Seed**: when a new company is created via `POST /api/companies`, [`EventConfigService.createDefaultEventTypes`](src/services/eventConfig.js) inserts the four system events (SCAN, MARK_SEEN, OCCUPY, VACATE) plus three default custom events (Call Waiter, Request Check, Call Manager).

**`EventConfiguration`** ([src/models/EventConfiguration.js](src/models/EventConfiguration.js)) is a per-resource override row. `resourceType` is `company`, `branch`, or `location` (location = table). Override fields (`eventName`, `userColor`, `userIcon`, `priority`, etc.) are nullable; `null` means inherit from the next level up.

Resolution order at a table: **table override → branch override → company override → EventType base**.

The service that resolves everything is [src/services/eventConfig.js](src/services/eventConfig.js). Key methods:
- `getCustomerEventsForTable(tableId)` — buttons the customer sees.
- `getAdminEventsForTable(tableId)` — types the admin can dispatch.
- `getAllEventsWithConfiguration(resourceType, resourceId, companyId, branchId, includeSystemEvents)` — iterates event types and resolves the most-specific override.
- `resolveEventsForTable(tableId, includeSystemEvents)`.
- `findEventTypeByLegacyType(legacyType, companyId)` — bridge from the old `type` string to a new `EventType` row.
- `createDefaultEventTypes(companyId, createdBy)` — seed on company creation.

---

## Authentication

Magic-link flow (no passwords):

1. User enters email at `/admin/login`. Frontend calls `POST /api/auth/login-request`.
2. Backend generates an `AuthToken` (64-hex, 15-min expiry) and emails a link.
3. User clicks link → React route reads token → calls `POST /api/auth/verify-token`.
4. Backend marks token `used`, returns JWT (7-day expiry) + user + permissions payload.
5. Frontend stores three keys in `localStorage`: `heymozo_token`, `heymozo_user`, `heymozo_permissions`.
6. Axios interceptor in [src/services/api.js](src/services/api.js) adds `Authorization: Bearer <token>`. On `401`, it clears the keys and redirects to `/`.

**Permissions** are checked hierarchically: if you have permission on a `company`, you have access to all its `branches` and `tables`. The walker is `authService.hasPermission(userId, resourceType, resourceId)` in [src/services/auth.js](src/services/auth.js).

**Middleware** ([src/middleware/auth.js](src/middleware/auth.js)): `authenticate`, `requireAdmin`, `checkCompanyPermission`, `checkBranchPermission`, `checkTablePermission`. Admin users (`isAdmin: true`) bypass every permission check.

**Route protection** in the React app uses [src/components/ProtectedRoute.js](src/components/ProtectedRoute.js), which on every navigation calls `GET /api/auth/check-access?route=<path>` to ask the backend whether the current user can see that path. Two paths are short-circuited as accessible to any authenticated user without asking the backend: `/admin/config` and `/admin/company/create`.

---

## Routing

### Public (no auth)
| Path | Component | Notes |
|---|---|---|
| `/` | LandingPage in [src/App.js](src/App.js) | Hero + features + contact form → `POST /api/mailing-list` |
| `/faq` | [FAQ.js](src/components/FAQ.js) | |
| `/user/:companyId/:branchId/:tableId` | [UserScreen.js](src/components/UserScreen.js) | Customer interface; QR destination |
| `/login`, `/admin/login` | LoginPage / LoginForm | Magic link form |

### Protected (any authenticated user)
| Path | Component |
|---|---|
| `/admin/config` | [CompanyList.js](src/components/CompanyList.js) |
| `/admin/company/create` | [CompanyCreate.js](src/components/CompanyCreate.js) |
| `/admin/:companyId/config` | [CompanyConfig.js](src/components/CompanyConfig.js) |
| `/admin/:companyId/:branchId/config` | [BranchConfig.js](src/components/BranchConfig.js) |
| `/admin/:companyId/:branchId/urls` | [TableUrls.js](src/components/TableUrls.js) (QR PDFs) |
| `/admin/:companyId/:branchId` | [AdminScreen.js](src/components/AdminScreen.js) (real-time dashboard) |

### Backend route files
- `server.js` — Express bootstrap. Mounts: `/api/auth` ([auth.js](src/routes/auth.js)), `/api/users` ([users.js](src/routes/users.js)), `/api` ([events.js](src/routes/events.js)), `/api` ([routes/index.js](src/routes/index.js) at line ~411 after `authMiddleware.authenticate`).
- A handful of public routes (GET company/branch/table by ID, POST table events, POST mailing-list) are mounted **directly in server.js above** the protected mount, so they don't require auth.

> **Gotcha**: many legacy routes have been moved out of `server.js` into `src/routes/index.js`. The commented-out blocks in `server.js` are the migration trail. Never re-enable them without checking whether the new version exists in `routes/index.js`.

---

## AdminScreen real-time loop

[src/components/AdminScreen.js](src/components/AdminScreen.js) is the core staff dashboard. Pattern:

- `useEffect` sets up a `setInterval(fetchData, 6000)` (`refreshInterval = 6000` at line 24).
- Each tick refetches all tables + their unseen events for the branch.
- `countUnseenEvents(events, eventTypes)` derives the badge counter per table. Excludes `systemEventType: 'SCAN'` (scans don't count as actionable).
- A second interval drives a visible countdown until the next refresh.
- A `useEffect` watching the total unseen count plays [src/sounds/notification.mp3](src/sounds/notification.mp3) when the count increases (not on initial mount).
- Sorting is configurable: by `priority` (event urgency) or `tableNumber`. Persisted in component state.

The "Liberar todas las mesas" button calls `releaseAllTables(branchId)` which POSTs to `/api/branches/:branchId/release-all-tables`. That route is in [src/routes/index.js](src/routes/index.js) (the legacy duplicate in `server.js` was removed in commit `a8a9e2b`).

---

## UserScreen flow

[src/components/UserScreen.js](src/components/UserScreen.js):

1. On mount, fetches company + branch + table in parallel.
2. Immediately sends a SCAN system event (`POST /api/tables/:tableId/events`).
3. Renders dynamic buttons from `availableEventTypes` (resolved by `getCustomerEventsForTable` on the backend). [ButtonsGroup.js](src/components/ButtonsGroup.js) iterates the array — no fallback if empty.
4. Local session history (the "ver eventos" modal) lives in component state only — not persisted to backend.

---

## QR PDF generation

[src/components/QRGeneratorModal.js](src/components/QRGeneratorModal.js) + [QRCodeDocument.js](src/components/QRCodeDocument.js) using `@react-pdf/renderer`. Configurable per branch: logo, background image, text color, font, QR dark color, size, optional website text overlay.

---

## Email

Magic links go through Resend ([src/services/email.js](src/services/email.js)).

Environment variables:
- `RESEND_API_KEY` — API key. If unset, emails are logged to the server console instead of being sent (useful in dev).
- `EMAIL_FROM` — sender (default `onboarding@resend.dev`).

Tokens are always logged to the server console regardless of mail delivery, for local testing.

---

## Database

PostgreSQL via Sequelize. Config split per environment in [src/config/](src/config/) (`config.json`, plus `database.js` selector). Migrations in [src/database/migrations/](src/database/migrations/).

In development the server auto-creates the database if it doesn't exist. In production it does not — you have to provision it.

Most domain models use `paranoid: true` (soft delete via `deletedAt`). `Event` and `EventConfiguration` do not.

---

## Frontend state and storage

- No Redux / Zustand / Context API for app state. Components fetch their own data and own their own state.
- `localStorage` keys in active use:
  - `heymozo_token`, `heymozo_user`, `heymozo_permissions` — auth.
  - The new redesign may add more (per the mockup); check [MOCKUP_HANDOFF.md §9](MOCKUP_HANDOFF.md) before adding.
- `sessionStorage` — not used in the destination app today.

---

## Known gotchas

1. **Two coexisting event systems**: `Event.type` (legacy string) and `Event.eventTypeId` (current FK). When creating events from new code, always set `eventTypeId`. When reading, prefer the joined `EventType` row. When you must bridge, use `EventConfigService.findEventTypeByLegacyType`.
2. **Sequelize alias casing**: the association is `Table.hasMany(Event, { as: 'events' })` — lowercase `'events'`, not `'Events'`. Mismatched aliases fail silently and return empty arrays. Bug of this exact kind was fixed in `a8a9e2b`.
3. **`server.js` has commented-out duplicate routes**: don't re-enable without checking `routes/index.js`. The active mount of `routes/index.js` happens *after* most of `server.js`, so anything that hits both paths is served by `routes/index.js`.
4. **Public routes mounted in `server.js` skip JWT auth** — they exist so customers without an account can scan a QR. Don't reintroduce auth to them without an explicit reason.
5. **Admin users bypass all permission middleware**. If you're testing access control, do it with a non-admin user.
6. **Sound effects require user interaction first** (browser autoplay policy). The `notification.mp3` only plays after the user has interacted with the page once.

---

## Style and conventions

- React: function components + hooks. No class components in new code.
- CSS: one `.css` per component, colocated. BEM-ish naming. No Tailwind, no CSS-in-JS.
- Backend: explicit try/catch + `console.log/error` everywhere. Migration toward structured logging not started.
- Many strings in user-facing UI and error messages are in **Spanish** (the product is Argentine). Match the surrounding code when adding new copy.
- The codebase uses `console.log` with emojis for tracing (e.g. `🔐 AUTH MIDDLEWARE`). Keep this pattern when extending existing handlers.
