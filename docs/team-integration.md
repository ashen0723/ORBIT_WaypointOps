# Team integration and end-to-end verification

The default browser now signs in to the real API and uses a shared four-role operations workspace. All
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
- 52 unit/router/outbox tests: 38 API + 14 web. Contract and active-app type checks and production builds pass.

`decisions.scenarios.cjs` retains its earlier focused delivery/receipt fixtures. The new
`connected.scenarios.cjs` and `browser.scenarios.cjs` exercise real writes through the API.

## Deliberate UI changes and practical limits

The new workspace is a functional shared integration surface using the existing green/white visual
language. It replaces four disconnected mock experiences. Existing Designathon layouts, route maps,
drag-and-drop planning, detailed dashboards and signature drawing are retained as prototype references;
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
