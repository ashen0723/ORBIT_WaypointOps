# Store Manager backend integration (#13)

The Store API uses the live JWT guard, database catalog, existing workflow services and four committed migrations. The mounted OperationsApp Store flow remains connected to these contracts.

## Endpoints

| Endpoint | Contract / scope |
|---|---|
| `GET /api/outlets/me` | Assigned Store outlet with depot; Store Manager only. |
| `GET /api/orders` | Store-scoped or Dispatcher queue; same `{items,nextCursor}` and `date`, `status`, `depotId`, `limit`, `cursor` filters as `/store/orders` and `/dispatcher/orders`. |
| `GET /api/orders/catalog` | Alias for `/catalog`; active database catalog for the Store brand, cursor pagination. |
| `GET /api/orders/policy?requestedDate=YYYY-MM-DD` | Store preview: `requestedDate`, `effectiveDate`, `rolledOver`, `serverDate`, `afterCutoff`, `timezone`, `cutoff`, `scheduledWeekday`. Defaults requestedDate to today in Colombo. Creation rechecks against server time. |
| `POST /api/orders` | Shared create contract: `clientActionId`, `requestedDate`, `temp`, `lines:[{catalogItemId,requestedQty}]`; returns `{order,receivedAt,cutoffApplied,schedulingMessage}`. |
| `GET /api/orders/:id` | Existing role-scoped order view, including retry/recovery quantities. |
| `GET /api/orders/:id/deliveries` | Delivery attempts; choose the actual delivery for receipt confirmation. |
| `GET /api/deliveries/:id/receipt` | Receipt for that delivery attempt. |
| `POST /api/deliveries/:id/confirm` | Shared receipt contract: `clientActionId`, `expectedDeliveryVersion`, `lines:[{orderLineId,acceptedQty,damagedQty,missingQty,note,photoRefs}]`. Store Manager of the assigned outlet only. |
| `POST /api/evidence` / `GET /api/evidence/:id` | Existing authenticated durable evidence upload/download; multipart `file` plus workflow metadata. |

There is one handler for order create/detail and receipt read/confirmation. Workflow services remain the source of mutation idempotency, optimistic versions, quantity accounting and audit records. Order and Receipt modules export no separate write implementation.

## Scheduling and receipts

Preview and creation share the eligible-run selector. Each run closes at 16:00 Colombo on its previous calendar day, including exactly 16:00. Use imported operating dates, exclude Sundays, and constrain STYLE to its configured weekday. A holiday gap does not automatically skip an extra operating run after today's cutoff. Preserve original requested date; record the eligible run as plannedDate. Missing schedule/calendar fails explicitly.

Receipt quantities reconcile against this attempt's handover, not the original requested quantity. Accepted + damaged + missing must equal the handover, excluding returned goods. Confirming a partial receipt does not automatically mark the whole order RECEIVED: existing recovery/cancellation decisions and accepted totals determine the resulting state. Delivery snapshots remain immutable; versions and idempotency records prevent duplicate confirmation. Evidence uses existing database storage and scope checks.

## Reconciliation of the original PR

Retained assigned-outlet access and Store policy/catalog/queue endpoints. Reused the main schema, seed, JWT implementation, receipt-line/evidence models, catalog importer and mutation records. Removed the unmerged duplicate OperatingDay migration and obsolete static catalog, filesystem receipt uploads, single-stop writes and receipt checks implementation. Do not apply the removed migration or copy the old ZIP over main. The old `checks`/`receivedQty`, name-based catalog payload, offset pagination and `/receipts` write route are superseded by the contracts above.

## Verification

Run `npm test`, `npm run typecheck`, `npm run typecheck:prisma -w apps/api`, `npm run build`, and the PostgreSQL integration/browser suite with an isolated TEST_DATABASE_URL. The HTTP suite covers Store aliases/role guards/policy versus create, outlet isolation, order replay, partial receipt arithmetic, recovery, evidence, stale versions and all four roles. Policy unit tests cover the exact cutoff, holiday gaps and weekly STYLE rollover.
