# Waypoint API and workflow contract v1

Implementation status and runnable end-to-end verification: [team integration](team-integration.md). The agreed wire DTOs below remain the integration boundary.

**Baseline date:** 2026-10-04. **Domain owner:** Ashen. **Database/platform owner:** Tharusha.

This is the implementation contract for the first connected four-role workflow. Ashen approved the
scenario decisions below in the project conversation. Wire shapes are exported by `@waypoint/contracts`.
The endpoints, persistence extensions and server validators described here are implementation targets:
the initial contract change did not implement them. The planning backend now implements a subset; see
[implementation status and setup](planning-backend.md) and [decisions/rescheduling](decisions-and-rescheduling.md).
The browser still uses prototype data.

## Authority and scope

- Challenge Booklet pp. 3-7 and 12: shared operational requirements and Hackathon scope.
- Challenge Booklet pp. 28-30: shared dataset field definitions and reference-table units.
- Detailed Member Workflow pp. 15-16 and 28: Ashen's ownership and cross-role handoffs.
- ORBIT Team Starter Pack pp. 6, 8-11: current repository boundaries and API conventions.
- Ashen's answers 1A/1B, 2A=B, 2B, 3A-3D, 4=C and 5A-5C: product decisions below.

The booklet's Datathon Task 2B same-brand/district grouping, whole-order rule and 270/480-minute
budgets are not automatically general Hackathon requirements. Its formula omits return travel only
for that task. No ML service or automatic optimizer is required for this Hackathon contract.
Submitted Designathon interactions remain the UI reference; document significant departures.

## Approved scenario decisions

| Decision | Contract |
|---|---|
| 1A | Save draft without reservations. Allocate reserves orders, vehicle slot/time and fuel. Publish exposes the trip to Loader. |
| 1B | Dispatcher can amend a published plan before departure. Increment plan version; Loader acknowledges the new version and re-confirms readiness. |
| 2A=B | Requested 20, approved loaded 16: retain requested 20, cancel 4 with reason/actor/time. No pending balance or automatic retry for those 4. |
| 2B | Outlet accepts 14 of the 16, returns 2 damaged: permit receipt for 14; Dispatcher explicitly decides recovery for the 2. Keep warehouse cancellation 4 separate. |
| 3A | Full handover requires recipient name and signature; photo optional. |
| 3B | Partial handover requires actual quantities, reason, recipient and signature; damage requires a photo. |
| 3C | Failed attempt requires reason and attempt photo, without recipient/signature. |
| 3D | Signature unavailable/refused: recipient name, photo and exception reason; flag for Dispatcher review. |
| 4=C | Preserve stale-plan offline delivery facts/evidence as a conflict. Dispatcher reconciles; never silently overwrite the new plan or discard the record. |
| 5A | Trusted API receipt time controls cutoff. At 16:00:00 Colombo the relevant cutoff is closed. Client click/capture time does not override it. |
| 5B | Fuel week is Monday 00:00 to next Monday 00:00 Colombo; no allowance carry-forward. |
| 5C | Allocate reserves estimated fuel including return to depot. Cancel before departure releases the reservation. |

## Wire conventions and ownership

- Base path `/api`. Success is the typed JSON object itself, not `{data: ...}`. Lists use
  `{items, nextCursor}`; use `limit` (default 50, max 100) and `cursor` for pagination.
- IDs are opaque strings. Preserve imported `OUT001...OUT120` and `VEH001...VEH060`; map depot names
  to existing `DEP-PLG`/`DEP-KDY`. Example IDs below are illustrative, not additional seed records.
- Wire `role` retains the existing lowercase browser values. Domain statuses/brands/temperatures
  use uppercase values. Map database roles to browser roles at the API boundary.
- Business dates are `YYYY-MM-DD`; `HH:MM` departure inputs use Colombo time and the trip date.
  Event timestamps include a timezone; server responses normalize them to UTC `Z`.
- Quantities are finite nonnegative integers, requested quantities positive. Weight/volume/distance/fuel
  are finite numbers in kg/m3/km/L. Efficiency must be positive. Compare unrounded calculations;
  display rounding must not allow capacity/fuel overbooking.
- Request body IDs do not authorize access. Resolve actor from token; derive Store outlet and brand
  from its account/outlet. Never accept client actor IDs, aggregate status or authoritative totals.
- Version fields are positive integers, initialized at 1 and incremented by server transactions.
  `version` protects a record; `planVersion` changes only when route/vehicle/date/order/quantity plan changes.
- Optional properties may be omitted; explicit `null` means unavailable. Never send password hashes,
  internal storage paths or the prototype browser database in API responses.
- TypeScript types are compile-time contracts only. Controllers must validate dates, enum values,
  nonempty strings, unique IDs, quantity arithmetic, resource ownership and current state at runtime.
  Use `import type` for these DTOs; runtime validation belongs in the API service/controller layer.

| Owner | Responsibility |
|---|---|
| Ashen | Domain contract, planning/trips, deferrals, Dispatcher decisions and integration |
| Tharusha | Auth/guards, database migrations, fleet/reference data, seed, Docker/deployment |
| Thisuni | Dispatcher UI and structured validation/error presentation |
| Mansi / Taluni | Store API / UI; order creation, receipt and discrepancy persistence |
| Sesanya | Loading API/UI; plan acknowledgement and readiness |
| Mansandi / Vihandu / Kuru | Delivery/sync API / Driver UI / evidence, durable queue and integration tests |

V1 scope policy: Dispatcher may view both depots; Loader operates within its assigned depot; Driver
operates trips assigned to its vehicle; Store operates its assigned outlet. Return 403 for wrong role
or resource scope, 404 for missing IDs. Resolve a vehicle's configured active driver, then snapshot it
on allocation for history; driver availability is not an independent feasibility constraint. A missing
or ambiguous driver association is a configuration error, not a driver scheduling optimization.

## Endpoint and payload handoffs

All paths below include `/api`. `Mutation` means a body containing `clientActionId`.
`PlanMutation` adds `expectedPlanVersion`; `VersionedMutation` adds `expectedVersion`.
Read/list DTOs and operation DTOs are in `packages/contracts/src/{domain,planning,operations}.ts`.
Creation returns 201, reads/validation/updates return 200, allocation release returns 200.
Repeated idempotent requests return the original status/body.

| Method/path | Role / owner | Request -> response |
|---|---|---|
| POST /auth/login | All / Tharusha | `LoginRequest -> LoginResponse` |
| GET /auth/me | Signed in / Tharusha | no body -> `SessionUser` |
| GET /catalog | Store / Mansi | scoped by account; `Page<CatalogItemView>` |
| POST /orders | Store / Mansi | `CreateOrderRequest -> CreateOrderResponse` |
| GET /store/orders | Store / Mansi | status/date filters -> `Page<OrderView>` |
| GET /orders/:id | Scoped role / Mansi | `OrderView` |
| GET /dispatcher/orders | Dispatcher / Ashen + Mansi | date/depotId/status -> `Page<OrderView>` |
| GET /vehicles | Dispatcher / Tharusha | required date/depotId -> `Page<VehicleView>` |
| POST /planning/drafts | Dispatcher / Ashen | `SaveDraftRequest -> PlanDraftView` |
| GET /planning/drafts/:id | Dispatcher / Ashen | `PlanDraftView` |
| PATCH /planning/drafts/:id | Dispatcher / Ashen | `UpdateDraftRequest -> PlanDraftView` |
| POST /planning/validate | Dispatcher / Ashen | `ValidatePlanRequest -> ValidatePlanResponse`; no mutation key needed |
| POST /planning/allocate | Dispatcher / Ashen | `AllocatePlanRequest -> AllocatePlanResponse` |
| PATCH /trips/:id/plan | Dispatcher / Ashen | `AmendPlanRequest -> TripView` |
| POST /plans/publish | Dispatcher / Ashen | `PublishPlansRequest -> PublishPlansResponse` |
| POST /trips/:id/release | Dispatcher / Ashen | `ReleaseAllocationRequest -> ReleaseAllocationResponse` |
| POST /planning/defer | Dispatcher / Ashen | `DeferOrderRequest -> DeferOrderResponse` |
| POST /stops/:id/reschedule | Dispatcher / Ashen | `RescheduleStopRequest -> TripView` |
| POST /stops/:id/acknowledge-reschedule | Assigned Driver / Mansandi | `AcknowledgeStopRescheduleRequest -> TripView` |
| GET /orders/:id/deferrals | Scoped Store/Dispatcher / Ashen | `Page<DeferralView>` |
| GET /trips, GET /trips/:id | Scoped roles / Ashen | `Page<TripView>` / `TripView` |
| GET /loader/trips | Loader / Sesanya | published depot trips -> `Page<TripView>` |
| GET /trips/:id/loading | Loader/Dispatcher / Sesanya | `LoadingView` |
| POST /loading/:tripId/start | Loader / Sesanya | `PlanMutation -> LoadingView` |
| PATCH /loading/:tripId/lines/:lineId | Loader / Sesanya | `LoadingLineRequest -> LoadingView` |
| POST /loading/:tripId/issues | Loader / Sesanya | `ReportLoadingIssueRequest -> LoadingIssueView` |
| POST /loading/issues/:id/decision | Dispatcher / Ashen + Sesanya | `LoadingDecisionRequest -> LoadingIssueView` |
| POST /loading/issues/:id/acknowledge | Loader / Sesanya | `AcknowledgeLoadingIssueRequest -> LoadingIssueView` |
| POST /trips/:id/acknowledge-plan | Loader / Sesanya | `PlanMutation -> TripView` |
| POST /trips/:id/ready | Loader / Sesanya | `PlanMutation -> TripView` |
| GET /driver/trips | Driver / Mansandi | assigned READY/in-progress trips -> `Page<TripView>` |
| POST /trips/:id/depart | Driver / Mansandi | `PlanMutation -> TripView`; online-only in v1 |
| POST /stops/:id/arrive | Driver / Mansandi | `RecordArrivalRequest -> TripStopView` |
| POST /stops/:id/outcome | Driver / Mansandi | `RecordOutcomeRequest -> DeliveryView` |
| GET /deliveries/:id | Scoped roles / Mansandi | `DeliveryView` including retrievable evidence refs |
| POST /driver/issues | Driver / Mansandi | `ReportDriverIssueRequest -> DriverIssueView` |
| POST /deliveries/:id/confirm | Store / Mansi | `ConfirmReceiptRequest -> ReceiptView` (issues saved atomically) |
| GET /deliveries/:id/receipt | Scoped roles / Mansi | `ReceiptView`, or 404 before confirmation |
| POST /deliveries/:id/recovery | Dispatcher / Ashen + Mansandi | `RecoveryDecisionRequest -> RecoveryView` |
| POST /evidence | Scoped uploader / Mansandi | multipart file + clientActionId + trip/order context -> `EvidenceUploadResponse` |
| GET /evidence/:id | Scoped roles / Mansandi | authenticated bytes, not a public storage directory |
| POST /sync/actions | Driver / Mansandi | `SyncActionsRequest -> SyncActionsResponse` |
| GET /sync/conflicts | Dispatcher / Mansandi | `Page<FieldConflictView>` |
| POST /sync/conflicts/:id/resolve | Dispatcher / Ashen + Mansandi | `ResolveFieldConflictRequest -> FieldConflictView` |

`lineId` above is the order-line ID within that trip attempt, never an unscoped editable order line.
Loading-line `expectedVersion` refers to that attempt-line record; publish/amend versions are separate.
Read responses used by Loader must include attempt-line versions. Changes to route assignments must
not overwrite delivery facts. Direct field routes use the same idempotency/conflict handler as sync;
a stale-plan direct write returns HTTP 409 with `details[].entityId` set to the preserved conflict ID.
Atomic receipt submission replaces the earlier suggested separate receipt-issue POST route.
Atomic outcome submission references previously uploaded POD, replacing a separate POD-finalization route.

## Planning lifecycle and feasibility

1. **Draft:** Store a `PlanDraft`, not active TripStops. Drafts reserve nothing and may become stale.
   A structurally complete draft can be infeasible. Deleting a draft cannot release someone else's trip.
2. **Validate:** Fetch current authoritative records. Return every useful violation with calculated
   totals and stops; return `totals: null` if missing reference data prevents calculation. This is a preview.
3. **Allocate:** Verify draft version, revalidate current database state, then atomically create a
   CONFIRMED trip, numbered slot 1 or 2, active stop assignments and fuel reservation. Orders become
   PLANNED. Derive driver from vehicle. The same draft cannot create two active allocations.
4. **Publish:** Revalidate all selected trips and expected plan versions atomically. Set `publishedAt`;
   status stays CONFIRMED. Only published trips appear to Loader. Publishing twice creates no duplicates.
5. **Amend:** Only before departure. Revalidate the replacement plan excluding its own reservations,
   exchange old/new reservations atomically, increment planVersion and invalidate acknowledgement/READY.
   Preserve physical loading facts for unchanged lines; changed/removed lines require unload/recheck.
   Removed orders return to CONFIRMED with an audit entry. Loader sees the revised published trip;
   no loading/ready action can apply under the old planVersion.
6. **Ready/depart:** All current lines checked, no OPEN/unacknowledged issue or pending unload check,
   current plan acknowledged. READY -> IN_TRANSIT only for the assigned Driver. Do not auto-complete stops.
7. **Release:** Before departure only; loaded goods must first be unloaded/reconciled. Archive the
   released assignment, release trip-slot/fuel reservations, keep history and return orders to CONFIRMED.
   Released trips are excluded from active lists/counts. Deferring an allocated order first requires a
   safe plan amendment/release; after departure use the explicit recovery/conflict workflow instead.

After departure, `/stops/:id/reschedule` records a reason/next-date intent for a nonterminal stop and
increments planVersion. It does not pretend the vehicle is unloaded, release fuel or create a second
active assignment. Store/Driver views show the proposed reschedule as awaiting reconciliation. Driver
acknowledges only after the loaded goods are returned/reconciled (record per-line returns and timestamp);
then stop becomes RESCHEDULED and order DEFERRED, with original attempt history retained. A partial or
completed handover must use delivery/recovery instead. An offline actual delivery racing this request
produces the preserved conflict in decision 4=C; Dispatcher reconciles that fact before releasing the
order for another attempt. Outstanding conflicts prevent reschedule acknowledgement from hiding a delivery.

Check depot, independent weight/volume limits, reefer requirement, van-only access, vehicle availability,
operating dates, receiving/mall windows, Fresh arrival strictly before 08:00, trip overlap, two routes,
weekly fuel and duplicate active assignment. V1 permits ambient and chilled on a reefer if all other
constraints fit; the prototype's blanket mixed-temperature prohibition is not a booklet requirement.
Frozen uses REEFER eligibility under the general rule, with explicit FROZEN order representation.

Use database constraints plus vehicle/order/fuel-ledger locking or serializable transactions with retries.
A transaction alone at ordinary read-committed isolation does not prevent simultaneous overbooking.
Fuel and time reservations must be checked again during allocate/amend, never accepted from the client.
Driver configuration is checked but independent driver availability is not a planning constraint.

## Quantities, shortfalls, recovery and receipt

Original requested quantities never shrink. Each attempt has its own planned/loaded/delivered/returned
quantities. Every cancellation records actor/time/reason and the triggering loading decision.

- Loader reports actual availability; it cannot approve its own shortage. REPLACEMENT_REQUIRED keeps
  issue OPEN until replacement quantity is checked. Dispatcher-approved SHIP_SHORT atomically records
  the approved loaded quantity and cancels only the newly approved missing quantity. Loader separately
  acknowledges that decision. Replays and another decision cannot cancel the same quantity again.
- A SHIP_SHORT decision carries the issue version AND expected plan version. Loaded amount must match
  the approved amount before READY; it cannot be negative or exceed that attempt's planned quantity.
  Changing the approved load increments planVersion and clears prior readiness/plan acknowledgement;
  return the new version in the issue/loading payload before Loader acknowledges it.
- Example: requested 20 = warehouse-cancelled 4 + loaded 16. At the store, loaded 16 = accepted/delivered
  14 + returned 2. A full handover of all 16 would be DELIVERED relative to the approved load, despite
  the original 20. A 14/2 handover is PARTIAL. FAILED means delivered 0. All quantities reconcile per line.
- Return goods remain traceable. Dispatcher chooses REDELIVER or CLOSE_WITHOUT_REDELIVERY for the 2;
  no automatic retry. The cancelled 4 are excluded from recovery. A later new demand for those 4 is a
  new Store order, not resurrection of the cancelled balance.
- REDELIVER creates a linked recovery record/pending eligible quantity on the original order. Planning
  then allocates that explicitly authorized balance as a new attempt, preserving old stop/delivery/POD.
  At most one active assignment per order. The pending retry uses the same planning endpoints; the server
  selects the authorized remaining quantities instead of reallocating the original requested quantities.
- A zero-loaded whole order is deferred/replanned before dispatch in v1; this is not an implicit
  whole-order cancellation state. Do not create a fake delivery just to finish a zero-goods stop.
- Store can receipt an accepted partial delivery immediately; it need not await retry. Receipt counts
  are against that delivery's recorded handover, excluding goods already returned. When the Store
  disputes the Driver's handover count, store damaged/missing counts as discrepancies, not silent edits.
  `acceptedQty + damagedQty + missingQty` equals the Driver's recorded deliveredQty per line.
  For the 14 accepted/2 returned example, receipt is 14 accepted, 0 additional damaged, 0 missing:
  do not count the already-returned 2 again as receipt damage. Recovery outstanding quantities are
  derived from attempt returns plus verified receipt discrepancies, with no double counting.
- Order DELIVERED means some handover is awaiting receipt, including partial handover. `recoveryPending`
  and the delivery outcome carry exception context. RECEIVED requires confirmed receipts for all handovers
  and terminal decisions for all outstanding quantities. A later approved retry moves the aggregate order
  through DEFERRED/PLANNED/... again; previous attempt history remains immutable.
- Trip completion derives from terminal stops. PARTIAL/FAILED/RESCHEDULED, ship-short cancellation or
  outstanding evidence review gives COMPLETED_WITH_EXCEPTIONS, not a false all-success trip.

## Evidence and offline reconciliation

DELIVERED/PARTIAL proof uses `ReceiverProof`: normal name/signature, or name/photo/exception reason.
Require photo for damage even with a signature. FAILED has attempt photo/reason and no receiver proof.
Signature exception always sets `requiresDispatcherReview`. Strings and evidence references must be
validated as nonempty and accessible to that delivery; a boolean `signed` or photo count is insufficient.

V1 evidence policy: PNG/JPEG/WebP, max 10 MiB per file, authenticated scoped storage. Check content type
and actual bytes. Evidence upload must be idempotent using the same client-generated key on retries.
Because the existing apiFetch is JSON-only, its owner must add multipart support without a manually set
Content-Type header. Configure proxy limits to allow multipart overhead above the per-file ceiling.

Driver caches the released plan and planVersion, writes action + actual evidence blobs to IndexedDB
before showing Saved on phone, uploads evidence on reconnect, then submits its durable action with
stable clientActionId. An unresolved local blob is never sent as a permanent evidence reference.
Do not mark SYNCED or delete pending blobs before the server confirms durable receipt.

The server keeps an idempotency record bound to authenticated user, action kind/target and payload hash.
Same key/same payload returns the original result; changed payload returns 409 IDEMPOTENCY_KEY_REUSED.
All field routes share this ledger. Payload capture time is evidence, not authority for cutoff or role checks.

If planVersion is stale, first verify historical assignment/ownership and payload/evidence validity. Save
the authorized action/evidence as a conflict without changing the newer operational plan. Unauthorized
records must not create operational conflicts. Report evidencePreserved only after transaction commit.
Within a sync batch, process in request order; retryable failures leave dependent actions pending, not
erroneously applied. Response is 200 with one ordered per-action result; malformed envelope/auth errors
use normal HTTP errors. ARRIVE is idempotent and cannot roll a terminal stop back to ARRIVED.

Dispatcher ACCEPT_RECORDED_FACT reconciles the actual delivery, supersedes conflicting future active
assignments as needed and records an audit resolution atomically. It must never make duplicate fulfillment.
If a replacement trip has departed or facts are uncertain, RETAIN_FOR_INVESTIGATION keeps the conflict
open and preserves both histories until safe reconciliation. Review may retry using a new mutation key
and current conflict version; the original field action/result remains retained.

## Dates, scheduling and fuel conventions

Booklet rules: next-day cutoff 16:00 Colombo, Fresh daily before 08:00, Style scheduled weekly,
Tech as needed, operating calendar, weekly fuel quotas. The following are explicit v1 calculation
conventions filling details not prescribed by the booklet:

- For a requested run, the cutoff is 16:00 on its preceding calendar day. At/after that instant choose
  the following eligible brand run whose cutoff has not closed. Preserve requestedDate and return the
  actual plannedDate plus cutoffApplied/message; never silently pretend the requested run was accepted.
  Use the trusted first API receipt instant, not a delayed database-write timestamp or client clock.
  Example: Fresh request for Saturday received Friday 15:59:59 is eligible; 16:00:00 moves to Monday
  if the supplied calendar marks Monday operating. No universal hardcoded Friday for Style: store
  each outlet's configured scheduled day and skip non-operating dates.
- Opening-window early arrivals may wait. Check service start falls within applicable receiving and
  mall windows; arrival after closing is infeasible. V1 allows service to finish after closing once
  accepted within the window. Fresh arrival at exactly 08:00 is late (strictly before opening).
- Use supplied district travel/handling reference data for deterministic same-district estimates.
  Missing travel data must produce a visible validation error, never guessed zero travel. Multi-district
  estimates need an explicit travel provider/table; v1 may support only estimable routes and explain that
  limitation. Do not silently treat Datathon's trip grouping as a universal operational rule.
- `fuelL = estimatedRouteDistanceKm / kmPerL`, including return travel. Group by Colombo Monday/week
  of departure. Compare committed fuel + other active reservations + candidate fuel against quota.
  On departure move reservation to committed planned consumption exactly once (no double deduction).
  V1 has no actual-telemetry reconciliation; keep that limitation visible. An in-transit cancellation
  cannot restore fuel as if no journey occurred. Releasing or moving an unstarted trip updates affected
  weekly ledgers atomically. No carry-forward. Two-trip counts likewise exclude released assignments.

## Errors and example payloads

400 malformed input; 401 invalid session; 403 unauthorized role/resource; 404 missing record;
409 state/version/concurrent allocation/idempotency conflict; 422 valid request violating business rules.
`ApiErrorBody` always has code, readable message and details array. A validation preview returns 200
with `valid:false`; the same violated rule during allocate/publish returns 422 without partial writes.
401 is never disguised as success. Actor/time/reason and before/after references belong in audit history.

```json
{
  "plan": {
    "date": "2026-10-05", "depotId": "DEP-PLG", "vehicleId": "VEH014",
    "plannedDeparture": "05:00", "orderIds": ["ORDER-EXAMPLE"]
  }
}
```

```json
{
  "code": "WEIGHT_EXCEEDED",
  "message": "Choose a vehicle with sufficient weight capacity.",
  "details": [{
    "code": "WEIGHT_EXCEEDED", "field": "vehicleId", "entityId": "VEH014",
    "message": "Load 1200 kg exceeds capacity 1000 kg.", "actual": 1200, "limit": 1000
  }]
}
```

## Schema and integration work required before endpoints go live

The current schema is a draft, not an implementation of every rule above. Tharusha owns migrations;
do not edit the committed 0001_init migration. Coordinate new migrations for:

1. Persisted PlanDraft separate from Trip; versions, publishedAt, planVersion and loader acknowledgement;
   released-assignment history and unload/recheck markers. Keep existing TripStatus values; release is
   an archival marker, not a fabricated COMPLETED trip.
2. One-to-many historical Order -> TripStop attempts with at most one active assignment. Current global
   TripStop.orderId uniqueness blocks retry; adjust active trip-slot uniqueness for release/reallocation too.
3. Per-attempt line quantities, immutable warehouse cancellation ledger, issue decision actor/time/version
   and separate acknowledgement; Delivery recovery and discrepancy records with outstanding-quantity checks.
4. Fuel ledger/reservations, planned return/timing data, vehicle-driver snapshot and date-specific availability.
5. Operating calendar, outlet brand schedule, catalog/unit load factors and district/handling references.
   Existing official files do not provide item-level catalog conversion: curate a documented seed catalog.
   Do not derive item weight/volume from arbitrary UI-entered totals.
6. FROZEN enum extension and mappings; existing official orders remain AMBIENT/CHILLED. Retain REEFER
   vehicle capability. Do not introduce a new freezer fleet category without source data.
7. Durable evidence metadata, review flags, receipts with counts, driver issue records, preserved field
   conflicts and idempotency request hash/result. Existing SyncAction unique key alone is insufficient.

Every new field in the shared DTOs requires an explicit database mapping or documented derivation.
The existing contracts package ships TS source; frontend can consume it directly. API integration should
use emitted declarations/package build wiring as needed for its current CommonJS/rootDir setup; do not
import browser mock services into NestJS. These declaration-only DTOs do not implement runtime guards.

## First implementation order and acceptance gates

1. Ashen/Tharusha agree migration mapping; Tharusha brings up real auth, reference data and test DB.
2. Mansi creates an order; Thisuni reads the same ID from Dispatcher API after refresh.
3. Ashen implements validate then transactional allocate, defer and publish; Sesanya retrieves published trip.
4. Sesanya reports 20/16 shortfall; Dispatcher approves cancel-4 ship-short; Loader acknowledges and readies.
5. Driver departs and records 14 accepted/2 returned with evidence; Store confirms 14; Dispatcher records
   explicit recovery for 2, with no recovery for the warehouse-cancelled 4.
6. Offline record survives reload; a changed plan produces retained evidence/conflict; reconciliation
   is audited and a replay cannot duplicate a delivery, cancellation or fuel charge.

Required tests: independent weight/volume failures; reefer/van/depot/windows; third route; fuel week/cutoff
boundary; simultaneous allocations of same order/vehicle; draft reserves nothing; publish gates Loader;
amend invalidates old acknowledgement/ready state; repeated shortfall decision cancels once; full vs partial
load arithmetic; failed-delivery proof without receiver; signature exception review; Store cross-outlet denial;
Driver cross-trip denial; receipt/return discrepancy; offline same-key replay and stale-plan evidence retention.

Contract check: `npm run typecheck -w packages/contracts` (includes positive/negative wire-shape examples).
This is not a substitute for the above backend/integration tests. The first milestone is one persistent
Store -> Dispatcher -> Loader handoff, followed by delivery/receipt/recovery on the same IDs.
