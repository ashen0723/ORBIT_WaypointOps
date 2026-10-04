# Shortfall, recovery, deferral and rescheduling

> Integration update: the real four-role workspace and connected Order/Delivery/Receipt/Sync APIs are now implemented. See [team integration and verification](team-integration.md) for current setup, migrations and test evidence; older handoff notes below describe the earlier phase.

These endpoints extend the persistent planning backend. They run with the same actor-bound idempotency
ledger, version checks, serializable transactions/retries and audit events. The frontend remains a separate
integration task. No production database was migrated as part of this change.

## Routes

All routes are under `/api`; use the existing bearer JWT. Creation returns 201, reads and updates return 200.

| Method/path | Role | Contract |
|---|---|---|
| GET `/trips/:id/loading` | Dispatcher or assigned-depot Loader | `LoadingView` |
| POST `/loading/:tripId/start` | Assigned-depot Loader | `PlanMutation → LoadingView` |
| PATCH `/loading/:tripId/lines/:lineId` | Assigned-depot Loader | `LoadingLineRequest → LoadingView` |
| POST `/loading/:tripId/issues` | Assigned-depot Loader | `ReportLoadingIssueRequest → LoadingIssueView` |
| POST `/loading/issues/:id/decision` | Dispatcher | `LoadingDecisionRequest → LoadingIssueView` |
| POST `/loading/issues/:id/acknowledge` | Assigned-depot Loader | `AcknowledgeLoadingIssueRequest → LoadingIssueView` |
| POST `/deliveries/:id/recovery` | Dispatcher | `RecoveryDecisionRequest → RecoveryView` |
| POST `/planning/defer` | Dispatcher | `DeferOrderRequest → DeferOrderResponse` |
| GET `/orders/:id/deferrals` | Dispatcher or that outlet's Store Manager | Paginated `DeferralView` |
| POST `/stops/:id/reschedule` | Dispatcher | `RescheduleStopRequest → TripView` |
| POST `/stops/:id/acknowledge-reschedule` | Assigned Driver | `AcknowledgeStopRescheduleRequest → TripView` |

Every mutation needs a new `clientActionId` for a new intent. Retry the unchanged request using the same key.
`expectedVersion` on a loading decision/acknowledgement refers to LoadingIssue.version; line writes use the
attempt-line version. Recovery uses **Delivery.version** and returns `sourceDeliveryVersion` for a subsequent
partial decision. `expectedPlanVersion` always refers to the current trip plan, including after a ship-short
approval or reschedule request. Replaying an old successful action returns its original result without applying it again.

## Shortfall and replacement

Start loading, check actual line quantities, then report MISSING/DAMAGED availability. Only one unresolved
issue per record/line is allowed. A Dispatcher can request replacement (issue stays OPEN) or approve SHIP_SHORT.
Loader cannot approve its own shortage. Confirmed loading issues prevent READY until separately acknowledged.

Example decision:

```json
{
  "clientActionId": "shortfall-decision-1",
  "expectedVersion": 1,
  "expectedPlanVersion": 1,
  "decision": {"action": "SHIP_SHORT", "approvedLoadedQty": 16, "reason": "Four cartons unavailable"}
}
```

For requested20/approved16, preserve requested20 and record exactly4 in both the cumulative cancellation and
this attempt's cancelled quantity, plus an immutable cancellation ledger with actor/time/reason/issue ID.
A retry or a second decision on that issue cannot cancel4 again. A later newly reported shortage cancels only
its additional delta. Excess already-loaded goods must first be explicitly unloaded; approval never rewrites
physical loading facts. Whole-order zero-load cancellation is rejected: unload/release/amend then defer instead.

SHIP_SHORT updates load totals, increments planVersion, clears plan acknowledgement and invalidates READY.
Loader checks the approved load, acknowledges the issue and current plan, then explicitly confirms READY.
REPLACEMENT_REQUIRED cancels nothing; issue acknowledgement fails until the full outstanding load is checked.

The request accepts durable photo-reference strings, rejecting browser blob/data URLs. Evidence upload,
metadata ownership checks and media retrieval remain the evidence owner's integration work; this milestone
does not provide an evidence store or claim uploaded media has been verified.

## Recovery and retry quantities

A terminal Delivery must reconcile per attempt: `deliveredQty + returnedQty = loadedQty` and loaded must
match the approved attempt quantity. Confirmed receipt counts must reconcile separately to that deliveredQty.
Historical handovers, receipts and attempts are never overwritten by a recovery decision.

Available recovery for a line is:

```text
attempt returned quantity
+ confirmed receipt damaged/missing quantities
- quantities already decided (redeliver OR close)
```

Warehouse cancellations never enter that balance. Choosing a receipt discrepancy in a Dispatcher decision is
its explicit verification/authorization; the audit links the receipt and chosen quantities. Unconfirmed or
inconsistent receipts cannot introduce a recovery quantity. Store14 accepted/Driver14 handed over/2 returned
means recovery2 and receipt14/0/0, not receipt14 plus2 damaged again.

Example after delivery14/return2:

```json
{
  "clientActionId": "recovery-1",
  "expectedVersion": 1,
  "decision": {
    "action": "REDELIVER", "nextDate": "2026-10-06", "reason": "Replace two returned cartons",
    "lines": [{"orderLineId": "line-id", "qty": 2}]
  }
}
```

CLOSE_WITHOUT_REDELIVERY uses the same positive lines/reason without nextDate. Decisions can cover subsets;
all later decisions must use the returned sourceDeliveryVersion and can consume only the remaining balance.
Simultaneous decisions cannot spend the same balance twice. Different pending retry decisions for one order
must use the same nextDate; use the deferral endpoint to move an already authorized pending order.

REDELIVER stores server-authorized `Order.pendingQuantities`, sets the order DEFERRED and permits the existing
planning endpoints to allocate only those quantities. On allocation, copy them into new TripStopLines and clear
the pending balance atomically. Recovery decisions link to the initial retry stop; later released/replaced retry
attempts remain traceable through the order's attempts and audit events. Releasing/removing a retry restores
that attempt's uncancelled balance, never the original requested20. A retry that fails is a new delivery with
its own recovery balance; it does not reopen the source decision or resurrect cancelled goods.

Weight/volume for reduced quantities use immutable per-line unit factors. Single-line legacy orders allow an
exact factor from their original aggregate totals; reduced heterogeneous orders without factors fail closed
with REFERENCE_DATA_MISSING. Catalog/order creation must supply those authoritative factors. No arbitrary
proportional division of a mixed order is used.

`DecisionsService.reconcileOrder(tx, orderId)` recomputes aggregate recovery/status from all attempts and receipts.
Delivery/Receipt owners must call it inside their write transaction and keep OrderLine aggregate deliveredQty
consistent with their quantity semantics. An order does not become RECEIVED while receipts, recovery quantities,
pending retries or evidence review remain. Closed failed attempts retain FAILED and the Dispatcher close reason;
no receiver receipt or successful delivery is invented. The aggregate terminal state remains RECEIVED under
v1 once every actual handover (if any) is receipted and every outstanding quantity has a terminal decision.

## Deferral

POST `/planning/defer` requires orderId, expectedVersion, nextDate and reason. Only an unassigned
CONFIRMED/DEFERRED order can be deferred. An allocated order must first be safely amended/released; an
in-transit order uses the stop reschedule flow. This prevents freeing loaded goods or another trip's reservations.

The next date must be later than the current eligible run and explicitly operating in the calendar. Preserve
requestedDate, set planned/deferred date, increment deferral count/version and append an OrderDeferral audit
record. Pagination is `limit` (1–100, default50) and opaque `cursor`. Store access is limited to its own outlet.

## In-transit rescheduling

Dispatcher can request a later operating date for an active PLANNED/ARRIVED stop on an IN_TRANSIT trip,
provided there are no actual delivery/return facts. A recorded partial/completed/failed attempt uses recovery.

The request persists nextDate/reason/request actor/time and increments planVersion. It **does not** release the
active order assignment, restore fuel or mark goods delivered/returned. Other planning attempts remain blocked.

The assigned Driver subsequently submits current planVersion, a timezone-bearing returnedAt between request
and server time, and the exact returnedQty for every loaded line. Missing/extra/duplicate/partial quantities,
wrong Driver, stale versions and unresolved stored field conflicts are rejected. Return facts are retained on
the original attempt, its status becomes RESCHEDULED, the order becomes DEFERRED with only that returned
balance available for a new attempt, and a deferral record is appended once. The trip completes with exceptions
only after all its route stops are terminal. Fuel already committed and the original trip slot remain consumed.

Offline capture/resolution endpoints are not implemented here. Existing FieldConflict/SyncAction conflicts
block both return acknowledgement and reallocation of affected historical orders; this prevents an existing
conflict from being hidden. The Driver/sync owner must preserve newly arriving stale facts using the shared
contract and reconcile them if they arrive after acknowledgement.

## Migration and tests

Apply `0003_decisions_and_rescheduling` with `npm run db:deploy -w apps/api`. It preserves prior migrations,
adds decision/acknowledgement/version fields and OrderDeferral, backfills exact single-line unit factors, and
adds constraints against excess cancellation and duplicate unresolved issues. Existing ambiguous/manual
recovery records or mixed-order factors require explicit owner backfill, not guessed authorization.

Run `npm test`, then `npm run test:integration -w apps/api`. The latter applies all migrations to disposable
PostgreSQL WASM and exercises HTTP permissions/versions, 20/16/14 cancellation/recovery, retry release/reallocate,
replacement and zero-load rejection, receipt discrepancies, scoped deferral history, reschedule exact returns,
conflict blocking, preserved fuel and concurrent recovery decisions. Delivery/receipt/departure facts are seeded
fixtures for those separate modules; the decisions themselves run through real routes and transactions.

For native PostgreSQL multi-connection verification use
`TEST_DATABASE_URL=... npm run test:postgres -w apps/api`. Native PostgreSQL was unavailable locally; the embedded
suite does not substitute for native serializable-concurrency testing. Frontend and complete offline/receipt
integration remain separate work.
