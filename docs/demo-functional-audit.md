# Functional audit — 5 October 2026

## Verdict

The mounted Store Manager, Dispatcher, Loader and Driver applications use authenticated backend APIs backed by Prisma/PostgreSQL. The complete `Waypoint_Demo.pdf` scenario passed in Chrome against a disposable native PostgreSQL database after the fixes below. Workflow transitions were performed through the real UI; test setup inserted reference data/users only. Database assertions checked saved quantities, vehicle assignment, arrival, delivery, receipt and evidence bytes.

This is a functional integration audit of the mounted application and its core workflows. It is not a production load test, penetration test, or a claim that every legacy prototype file is complete.

## Findings fixed

| Finding | Change | Verification |
|---|---|---|
| Loader could not report a vehicle failure before departure | Added a versioned, idempotent `POST /trips/:id/vehicle-unavailable` action for the assigned-depot Loader and Dispatcher. Persists daily vehicle availability and audited reason; invalidates readiness/acknowledgment for pre-departure trips on that vehicle/day. | UI report persists; same request replay adds no duplicate audit; wrong role/depot and stale plan rejected. |
| Allocation-time vehicle checks alone could become outdated | Recheck vehicle availability at loading start, positive quantity updates, READY and departure. Zero quantity remains permitted for unloading. | Loading start, positive quantities and READY rejected after vehicle failure; unload remains possible. |
| Vehicle amendment API had no usable replacement action | Added Dispatcher Trip View replacement form. Existing amendment service revalidates capacity, refrigeration, van-only access, timing, fuel and Driver; loaded goods require unloading first. | Replacement rejected while 1 unit remains loaded; succeeds after unload, increments plan version and assigns replacement Driver. Old Driver loses trip access. |
| Loader required manual refresh for changed assignments | Poll visible Loader views every 10 seconds. Dispatcher overview prioritizes unavailable-vehicle trips. | Replacement appears without a manual Loader refresh; new plan must be acknowledged. |
| Store proof omitted actual arrival time | Map backend arrival time and show it beside proof of delivery. | Store receipt page displays arrival recorded while offline. |
| Dispatcher lacked the Store's complete damage report | Show receipt line quantities, notes and authenticated photo evidence alongside original delivery and recovery decisions. | 10 handed over → 8 accepted + 2 damaged, photo saved, original delivery remains intact, 2-unit recovery displayed. |
| Offline reload lost the Driver logo and showed a broken decorative avatar | Cache the public logo with the app shell; use the real Driver’s initials instead of a sample portrait. API/evidence responses remain excluded from the service-worker cache. | Offline browser reload checks all rendered images load. |
| Duplicate unguarded Fleet list/detail routes | Preserve the canonical paginated `/vehicles` workflow API; move the legacy projection to `/fleet/vehicles`, restrict legacy list/detail to Dispatcher. | Anonymous requests rejected; Store cannot read Dispatcher fleet endpoint; Fleet HTTP suite passes. |

Existing Dispatcher logo edits were retained. No migration, user database reset, commit or push was performed for these changes.

## PDF scenario results

| Step | Result |
|---|---|
| Store creates a chilled order for a van-only outlet | PASS — UI-created order with 10 units persisted |
| Invalid truck assignment | PASS — validation rejects it; no allocation created; draft retained |
| Dispatcher selects refrigerated van, allocates and publishes | PASS — Loader receives the published trip |
| Loader checks quantities and reports refrigeration failure | PASS — unavailable state and reason persisted; further loading blocked |
| Dispatcher assigns replacement refrigerated van | PASS — unloading enforced, route validated, Driver reassigned, plan version advances |
| Loader receives replacement, finishes and marks ready | PASS — automatic update, quantity check and current-plan acknowledgment required |
| Replacement Driver departs | PASS — authenticated assigned Driver departs ready trip |
| Driver records arrival and delivery offline | PASS — both saved locally; reload while offline preserves pending work |
| Reconnect without manual sync | PASS — automatic synchronization creates exactly one delivery and persists signature bytes |
| Store sees quantities, arrival and proof | PASS — real delivery and authenticated evidence shown |
| Store reports two damaged products | PASS — accepted 8, damaged 2, missing 0, note and photo persisted |
| Dispatcher reviews report and original handover | PASS — original 10-unit delivery and Store discrepancy shown together; outstanding recovery 2 |

The test browser's system clock is the actual test time. Orders may be planned for the next eligible operating date; this test does not simulate driving at a future clock time.

## Core module coverage

| Module | Evidence |
|---|---|
| Auth / role boundaries | Login, invalid password, role-scoped pages/APIs, outlet/depot/Driver ownership and foreign evidence denial |
| Database | Four migrations on native PostgreSQL; foreign keys/unique constraints, concurrent allocation and transaction replay |
| Store orders | Scoped catalog, UI creation, server-selected eligible date, persisted history/details/filtering |
| Planning | Draft persistence, validation, atomic allocation/publish, amendment, reservation release and duplicate allocation protection |
| Constraints | Unit tests cover capacity, refrigeration, van-only access, delivery windows, operating calendar, trip limits and fuel rules; browser demonstrates invalid truck + valid van |
| Loading | Actual quantities, damaged/missing stock photos, Dispatcher shortfall decisions, acknowledgment, readiness and vehicle replacement |
| Driver | Assigned routes, departure, incidents, offline persistence, evidence upload, idempotent synchronization and stale-plan reconciliation |
| Receipts / recovery | Receipt arithmetic, failed-attempt receipt denial, discrepancy recovery, authorized retry quantities and immutable attempt history |
| Deferrals / rescheduling | Reasons, version checks, history, eligible dates, scope checks, physical-return and pending-offline-fact gates |
| Frontend | Dispatcher navigation and planning, Store creation/history/receipt, Loader pages and mobile layout, Driver mobile/offline flow |

## Reproducible checks

- `npm test`: 96 frontend tests + 154 API tests = **250 passing tests**.
- `npm run typecheck`: contracts and mounted live frontend pass.
- `npm run build`: web and API pass.
- Native PostgreSQL integration with all browser flags: existing four-role, Store, Dispatcher and new PDF demo scenarios pass, together with concurrency/decision/sync suites.
- Docker: rebuilt API/web and existing PostgreSQL are healthy; all four real seed-account logins, role API reads and page navigation pass at localhost:8080.
- Seed/import integration: PASS — fresh migration deployment, seed replay without overwritten operator work, durable seeded evidence/receipts, importer dry-run/apply/replay. The importer fixture now chooses a date after the seeded calendar, fixing a test collision caused by the rolling calendar.

Run the PDF test using `npm run test:demo`, or all browser suites using `npm run test:e2e:all`, with `TEST_DATABASE_URL` pointing at a **disposable local PostgreSQL database**. Both scripts build first. The native harness creates and drops its own randomly named schema. Chrome must be installed; the demo tests use Playwright's `chrome` channel. Test-only emails/passwords and reference IDs are created inside the isolated schema.

A local embedded-PostgreSQL helper was used for this audit; it is outside the repository and is not required by the commands above. No test records were inserted into the user's running application database.

Some regression fixtures intentionally contain historical deliveries without immutable payloads. Their reads return `LEGACY_DELIVERY` (422), and an unconfirmed receipt returns 404. These are expected fixture/error-state checks, not failures in the new demo lifecycle.

## Boundaries and remaining non-blocking work

- Refresh is polling (Loader 10s, most Dispatcher views 15s), not a push notification/SMS system.
- Driver offline work requires an earlier online sign-in, cached route/app and online departure. Localhost or HTTPS is needed for the service worker. Offline arrival and outcome are verified; arbitrary first-time offline login is not supported.
- Account-security settings, a packaged mobile download, real GPS navigation and SMS/call integrations are not provided by this workflow. Placeholder/prototype files remain in the repository; the tested role entry points are in `apps/web/src/app/App.tsx`.
- The seed is fictional demo reference data. Production routes, travel times, operating calendars, catalog and vehicle availability require maintained operational data. Imported legacy records missing canonical delivery payloads need a deliberate backfill; the UI does not fabricate proof.
- Vehicle unavailability is a dated fleet decision. Replacement does not silently mark the failed vehicle repaired. Current workflow uses another available vehicle; fleet administration/restoration is a separate operational task.
- Build reports a large frontend chunk warning. That is a performance follow-up, not a failed build. Real-device mobile, slow-network/load and multi-instance production testing remain outside this local audit.

For the team demo and local run commands, follow [demo-runbook.md](./demo-runbook.md).
