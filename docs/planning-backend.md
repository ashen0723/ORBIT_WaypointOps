# Planning backend milestone

> Integration update: the real four-role workspace and connected Order/Delivery/Receipt/Sync APIs are now implemented. See [team integration and verification](team-integration.md) for current setup, migrations and test evidence; older handoff notes below describe the earlier phase.

This milestone implements a persistent, authenticated Draft → Allocate → Publish API. The browser
prototypes are not connected to these endpoints yet. Contract DTOs remain in `@waypoint/contracts`;
the API consumes emitted declarations, and runtime input validation lives in the API.

## Implemented routes

All paths start with `/api`.

| Route | Role / behavior |
|---|---|
| POST `/auth/login`, GET `/auth/me` | Active database accounts; HS256 JWT, role/scope reloaded per request |
| POST `/planning/drafts` | Dispatcher; saves structurally valid plans without reserving anything |
| GET/PATCH `/planning/drafts/:id` | Dispatcher; optimistic version check on edits; allocated drafts are immutable |
| POST `/planning/validate` | Dispatcher; authoritative feasibility preview, no reservation |
| POST `/planning/allocate` | Dispatcher; current validation, order/slot/fuel reservation and audit in one serializable transaction |
| POST `/plans/publish` | Dispatcher; atomic batch validation/publication; Loader sees only published trips |
| PATCH `/trips/:id/plan` | Dispatcher; predeparture amendment, replacement reservations, version increment and readiness reset |
| POST `/trips/:id/release` | Dispatcher; only after affected goods are unloaded/reconciled; preserve attempt history |
| GET `/trips`, GET `/trips/:id` | Dispatcher, assigned-depot Loader, assigned Driver with READY/in-progress/completed trip |
| GET `/loader/trips` | Published, unreleased trips in the Loader's depot |
| POST `/trips/:id/acknowledge-plan` | Assigned-depot Loader; exact current plan version |
| POST `/trips/:id/ready` | Assigned-depot Loader; acknowledgement, checked quantities, resolved issues and no pending unload |

Create draft and allocate return 201. Publish/acknowledge/ready/release return 200. All mutations require
`clientActionId`; same actor/key/payload replays the stored response, including after later plan changes.
Reusing a key for another payload/action returns 409. Payload results and audit commit with the action.
Three bounded retries handle serialization/uniqueness races; validation is repeated on every attempt.

## Setup and repeatable demo

1. Set `DATABASE_URL` and a non-placeholder `JWT_SECRET` of at least 32 characters in `.env`.
2. Run `npm run db:deploy -w apps/api`, then `npm run db:seed -w apps/api`.
3. Optional: `npm run db:seed:planning-demo -w apps/api`. This creates **fictional** travel/handling data
   and two demo orders for `2026-10-05`; override with `PLANNING_DEMO_DATE=YYYY-MM-DD` (Monday–Saturday).
   It never overwrites existing references or progressed orders. These estimates are not official data.
4. Start `npm run dev:api`; log in via POST `/api/auth/login` using a seeded account and its configured password.
5. Send the returned bearer token with every subsequent request.

Example draft body (POST `/api/planning/drafts`):

```json
{
  "clientActionId": "demo-draft-1",
  "plan": {
    "date": "2026-10-05", "depotId": "DEP-PLG", "vehicleId": "TRK-021",
    "plannedDeparture": "05:00",
    "orderIds": ["DEMO-PLAN-2026-10-05-1", "DEMO-PLAN-2026-10-05-2"]
  }
}
```

Use the response `id`/`version` for POST `/api/planning/allocate` with
`{clientActionId, draftId, expectedDraftVersion}`. Then publish with
`{clientActionId, trips:[{tripId, expectedPlanVersion}]}`. Login as the Loader to retrieve `/api/loader/trips`.
Loading start/line checks/issue reporting, Dispatcher decisions and Loader acknowledgement are now implemented.
See [decisions and rescheduling](decisions-and-rescheduling.md) for routes and integration handoffs.

## Validation and persistence

- Runtime parsing checks real calendar dates, HH:MM, IDs, positive versions, unique nonempty order lists
  and bounded list sizes. Client-supplied totals/driver/status never become authoritative.
- Validate weight and volume independently, reefer, van-only, home depot, availability, configured active
  driver, operating calendar, receiving/mall windows, Fresh arrival strictly before 08:00, overlap including
  return travel, two trips/day and weekly fuel. Early arrivals wait; service may finish after the closing time.
- `TravelLeg` is a directed, explicit leg keyed `depot:<id>` / `outlet:<id>`. `OutletHandling` supplies
  per-order stop service minutes. `source` identifies provenance. Missing/invalid travel (including return),
  handling or calendar data fails closed with `REFERENCE_DATA_MISSING`, null totals and no guessed route.
  Reference data importing/estimation is a platform-owner handoff, not a hardcoded same-district shortcut.
- Fuel is stored per trip: `fuelWeekStart` (Colombo departure week's Monday business date), `reservedFuelL`,
  `committedFuelL`. Sum other unreleased trips in that week; no carry-forward. This is the ledger representation
  for this milestone. Departure handlers must atomically move reserved to committed once; departure is not yet implemented.
- Migration `0002_planning_contract` preserves `0001_init`. Partial SQL indexes protect one active order
  assignment and one unreleased vehicle/date/slot; SQL restricts slots to 1/2. Keep these hand-authored indexes
  when generating future migrations: Prisma's schema-level ordinary indexes do not replace them.
- `PlanDraft` holds JSON `PlanInput`, version and allocation linkage. It is separate from `Trip`.
- `TripStopLine` keeps per-attempt quantities; migration backfills existing OrderLine loading/delivery facts.
  Removed stops remain archived at negative internal sequence positions; current wire stops expose positive positions.
- Amendments keep unchanged line facts. Removing loaded orders or moving loaded goods to another vehicle/depot/date
  requires unloading first. Reordering/departure changes preserve loads but clear acknowledgement and READY.
  Old plan versions cannot acknowledge or ready the revised plan. All issue statuses must reach `RESOLVED` before READY.
- Publishing revalidates all selected trips. Changed reference totals/timings or driver snapshot require an explicit
  amendment so stored reservations and Loader route never silently diverge from the newly computed route.
- Historical trips missing driver/timing/fuel data require an explicit backfill before using their vehicle for further
  planning. The migration does not invent past mileage, fuel or drivers.

## Decisions and remaining owner handoffs

Migration `0003_decisions_and_rescheduling` adds decision/acknowledgement stamps, exact per-line load factors,
authorized pending quantities and deferral history. Shortfall/replacement decisions, recovery decisions and
retry-only allocation, deferral, in-transit reschedule and Driver return acknowledgement are implemented.
See [decisions and rescheduling](decisions-and-rescheduling.md) for the full behavior and examples.

Store order creation and cutoff/brand scheduling, Driver departure/delivery writes, Store receipt submission,
evidence storage and offline conflict capture/resolution remain separate owner work. The new endpoints consume
persisted Delivery/Receipt facts and refuse inconsistent quantities. The frontend still uses mock services.

## Verification

- `npm test`: contract checks, existing web tests, planning feasibility/date/parser tests and health tests.
- `npm run test:integration -w apps/api`: builds, applies all three real SQL migrations to disposable PGlite PostgreSQL,
  starts the Nest API on an ephemeral localhost port, and exercises auth/scopes, draft reservations, allocation replay,
  atomic publish rollback/visibility, amendment/ack/readiness, unload/release, historical retries, concurrent HTTP
  allocation/recovery requests, shortfall cancellation, retry quantities, deferral history, reschedule return/conflict
  gates and database unique constraints. No user database is used. PGlite requires a single pooled
  connection, so this does **not** verify native PostgreSQL serializable multi-connection races.
- `TEST_DATABASE_URL=... npm run test:postgres -w apps/api`: runs the same suite on native PostgreSQL with 10 pooled
  connections and concurrent allocation. It creates a uniquely named test schema and drops only that schema in cleanup.
  Native PostgreSQL was unavailable in this development environment; this final concurrency gate remains to run on CI/DB host.
