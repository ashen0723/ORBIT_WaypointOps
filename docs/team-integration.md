# Team integration and end-to-end verification

The default browser signs in to the real API. Dispatcher now uses dedicated live screens; Loader, Driver and Store use the shared operations workspace. See [Dispatcher parts 1–6](thisuni-dispatcher-parts-1-6.md) for the follow-up implementation and its expanded checks. All
business writes go through PostgreSQL transactions; the old role prototypes remain in their directories
as design references and are no longer mounted by `App.tsx`.

## Integration map

| Team area | Running implementation | Handoff boundary |
|---|---|---|
| Ashen — planning and decisions | `apps/api/src/planning` | Existing draft/allocate/publish, shortfall, recovery, deferral and rescheduling APIs |
| Store — order and receipt | `apps/api/src/workflow/orders.service.ts`, `receipts.service.ts` | Server catalog factors, trusted cutoff, outlet scope, per-attempt receipt arithmetic |
| Driver — delivery and sync | `apps/api/src/workflow/field.service.ts` | Departure commits fuel once, proof ownership, delivery, incidents, offline conflict reconciliation |
| Shared browser | `apps/web/src/features/operations` | API workspace, durable actor-scoped IndexedDB queue and cached driver plans |
| Shared authentication | `features/dispatcher/contexts/SessionContext.tsx` | `/auth/login`, real JWT, per-tab session; expired session returns to login |

`WorkflowModule` owns the newly connected routes. The existing `orders`, `receipts`, `delivery`, `sync`,
`fleet` and `outlets` scaffolds are retained for their owners. When moving code into those modules,
remove the corresponding WorkflowController handler in the same change: do not register duplicate routes.
DTOs remain in `@waypoint/contracts`; backend imports use its built declarations.

## Run the shared demo

After installing dependencies and configuring `DATABASE_URL` and a real `JWT_SECRET`:

```bash
npm run db:deploy -w apps/api
npm run db:seed -w apps/api
npm run db:seed:planning-demo -w apps/api
npm run dev:api
npm run dev:web
```

The optional planning demo creates **fictional** catalog/load factors, handling times, travel legs and
90 calendar days. Existing reference records are not overwritten. It prints its starting date; choose
that date or a later eligible run in each role's Run date field. The normal seed creates demo accounts
and fleet/outlets, but intentionally does not invent official travel data. For Docker, run the optional
seed with `docker compose exec api npm run db:seed:planning-demo` after startup.

1. Store: place a catalog order. Read the returned scheduled date (cutoff may move the requested date).
2. Dispatcher: select that run date, depot, vehicle and order; validate/save/allocate, then explicitly publish.
3. Loader: start loading, check actual quantities, report a shortage if needed. Dispatcher chooses
   replacement or ship-short. Loader acknowledges the decision and the current plan, then marks ready.
4. Driver: depart online; record arrival and delivery quantities, recipient and signature image. A failed
   attempt needs a photo/reason; a signature exception needs a photo/reason and Dispatcher review.
5. Store: confirm accepted/damaged/missing counts against the handover only. Dispatcher explicitly
   resolves returns or receipt discrepancies; retries preserve the original order and previous attempts.
6. Driver offline: save an outcome with its image, reload offline, reconnect and sync. A stale plan is kept
   as a conflict; Dispatcher can inspect the authenticated images and accept or retain the recorded facts.

Offline reload uses the **production build** service worker on localhost or HTTPS. Vite development
supports the queue but does not install the production service worker. Do not clear browser storage
while actions are pending. Signing out preserves queued evidence, and another account cannot flush it.
The queue serializes within and across tabs; the server independently enforces actor/action idempotency.
Conflicted/failed actions retain their blobs and block dependent actions for that stop.

## Verification commands

```bash
npm run typecheck
npm test
npm run build
npm run test:integration -w apps/api
TEST_DATABASE_URL='postgresql://…/test_database' npm run test:postgres -w apps/api
TEST_DATABASE_URL='postgresql://…/test_database' npm run test:e2e
```

`test:e2e` uses installed Google Chrome by default. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to another
Chromium executable if needed. It builds both apps, starts an isolated API and static web server, and
creates/drops a random schema in the test database. Never point this variable at a production database.
The test does not need seeded operational data or an already-running API. The schema is removed in
`finally`; reference fixtures and test users remain isolated from existing schemas.

Verified on 2026-10-04 with native PostgreSQL and headless Chromium:

- All four migrations, auth and cross-role/outlet/depot authorization.
- Atomic allocation/publication; concurrent duplicate allocation and recovery; reservation release.
- Real HTTP transitions for 20 requested → 4 warehouse-cancelled → 16 loaded → 14 handed over + 2 returned
  → receipt 14 → approved retry 2 → receipt 2 → order RECEIVED. No fabricated delivery/receipt rows in this scenario.
- Immutable delivery attempts, authoritative receipt arithmetic and single fuel commitment on departure.
- Photo/signature requirements, foreign proof rejection, signature-exception review gate and incident replay.
- Stale outcome preservation, replay of the same conflict, blocked return acknowledgment and explicit reconciliation.
- Four browser accounts: order → publish → load → depart → capture offline → reload offline → synchronize
  durable image/action exactly once → Store receipt → RECEIVED. No browser runtime exceptions.
- 62 unit/router/outbox tests: 40 API + 22 web (including the Dispatcher follow-up). Contract and active-app type checks and production builds pass.

`decisions.scenarios.cjs` retains its earlier focused delivery/receipt fixtures. The new
`connected.scenarios.cjs` and `browser.scenarios.cjs` exercise real writes through the API.

## Deliberate UI changes and practical limits

The new workspace is a functional shared integration surface using the existing green/white visual
language. It replaces four disconnected mock experiences. Existing Designathon layouts, route maps,
drag-and-drop planning and signature drawing are retained as prototype references; Dispatcher now has a real dashboard, seven-screen navigation, explicit planning actions and monitoring.
the active workspace uses forms and uploaded signature images. One item per new-order form is supported
in the current workspace; the API accepts multiple lines. API amendment and incident endpoints are
available for owners to build into their detailed screens. This is not a claim of complete visual parity
with every prototype screen.

`npm run typecheck` checks the reachable live application and contracts. The separate
`npm run typecheck:prototypes -w apps/web` still reports the inherited prototype type errors; it is not a
passing check. Those unused mock modules are excluded explicitly in `tsconfig.live.json` rather than
weakening strict checking of the running application.

Migration `0004_connected_workflow` adds catalog, durable image bytes, driver incidents, STYLE weekly
configuration, immutable delivery payloads and departure version snapshots. Legacy deliveries without
recorded payloads and already-departed legacy trips need a reviewed backfill; the API rejects missing
historical facts instead of inventing them. Official catalog/calendar/travel data and STYLE weekdays
must be supplied before use with real operations. PostgreSQL image storage is suitable for this demo;
production storage quotas, retention and object-storage migration are separate work.

Verification used disposable test databases. The user's configured application database has **not**
been migrated or reseeded by this work, and no commit, push or deployment was performed.


## JWT auth reconciliation (PR #6)

Authentication configuration is validated at API startup. `JWT_SECRET` must contain at least 32
non-padding characters and cannot be the example placeholder. `JWT_EXPIRES_IN` defaults to `12h`;
positive integer seconds and explicit durations are supported, with a minimum lifetime of one second.
Signing and verification both use HS256.

The current `LoginResponse` remains `{ token, expiresAt, user }`, including nullable outlet/depot/vehicle
scope fields. Authentication always reloads the account so deactivation and role changes take effect
on the next request. JWTs without an expiry or a nonempty subject are rejected.

Existing workflow/planning controllers keep `AuthGuard`, `Actor` and their current role annotations.
`AuthGuard` and the new `JwtAuthGuard` both pass the complete Authorization header to the service;
only the service parses it. Both role-decorator import paths use `waypoint.roles` and the same
`RolesGuard`, retaining handler overrides of controller-level roles. New controllers using the split
guards must apply `JwtAuthGuard` before `RolesGuard`.

Validation: 137 unit/HTTP tests (115 API including importer/auth, 22 web), active frontend/contract and
Prisma-script type checks, and API build. The native PostgreSQL/Chromium regression checks actual
four-role login and planning/loading/delivery/receipt/offline flows after reconciliation.


## Frontend session reconciliation (PR #10)

The live provider keeps `token` and the optional compatibility alias `jwtToken` equal to the real
backend JWT. No mock business token, mock identity mapping or mock database writes are used.
`waypoint.live.session` remains the per-tab storage key so existing sessions survive the update.
Old prototype authentication keys are discarded.

On online reload the provider checks `/auth/me` before rendering role content. Revoked sessions clear
on 401; other failures show retry/sign-out without discarding credentials. An unexpired cached Driver
session can restore capture on a network failure, allowing the existing IndexedDB queue to survive
an offline reload. This is not server authorization: reconnect rechecks identity and every replay is
still validated by the API. Non-Driver restoration requires a successful identity check. Expiry clears
the session without deleting the durable outbox. Logging in again can resume that actor's queue.

Pending sign-in responses cannot undo logout; an old request's 401 cannot expire a newly signed-in
account. Multipart evidence uploads retain browser-generated boundaries. Non-JSON HTTP errors retain
their status, while non-JSON success bodies are rejected as invalid responses.
