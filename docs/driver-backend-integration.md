# Driver backend integration (#11)

This integration uses the existing JWT identity, planning scopes, delivery snapshots,
mutation records, durable evidence and stale-plan review workflow. It replaces the PR's
parallel unguarded writes with the same services already used by the mounted Driver UI.

## Endpoints

| Endpoint | Result / authorization |
|---|---|
| `GET /users/driver/:userId/profile` | Driver's own active profile, assigned vehicle and depot. Never includes passwordHash. Another user's ID is forbidden. |
| `GET /trips/driver/:userId/today` | `{driver,date,items,nextCursor}` for Colombo today. Supports limit/cursor; uses published, ready/in-progress/completed trips assigned to the current driver and vehicle. A supplied date cannot change today. No vehicle returns an empty page. |
| `GET /trips/order/:orderId/delivery` | Canonical `{items,nextCursor}` delivery-attempt history, with existing order scope. Store, Driver and Dispatcher roles. |
| `GET /trips/:tripId/delivery-progress` | Dispatcher-only `{trip,totalStops,completedStops,remainingStops}`. Terminal attempts include delivered, partial and failed; completed does not mean successful. |
| `GET /sync/actions/:clientActionId` | Driver's own mutation record: `{clientActionId,recordedAt,result}`. Another actor's key returns 404. Preserves the original result, including CONFLICT; does not report conflicts as successful. |

Paths above are relative to `/api`. These are reconciled live contracts, not the original
PR's nested raw Prisma projections. The current frontend continues using the canonical
endpoints below; future Driver UI integration should use the shared contracts.

## Canonical mutations and reads

DeliveryController now owns `/trips/:id/depart`, `/stops/:id/arrive`,
`/stops/:id/outcome`, `/deliveries/:id`, `/deliveries/:id/review`,
`/driver/issues` and `/trips/:id/issues`. SyncController owns `POST /sync/actions`.
Their methods, HTTP status codes, guards and payloads are preserved from main. There are
no duplicate registrations in WorkflowController. Planning still owns `GET /trips/:id`.

Use `clientActionId`, `expectedPlanVersion`, `capturedAt` and the shared outcome quantities
and proof objects. Batch sync uses `{actions:[{kind,stopId,request}]}` (ISSUE identifies its
trip inside request). The actor always comes from the JWT. Replay checks the actor/key and
request fingerprint. Stale captured facts and evidence go to Dispatcher conflict review.
Uploading and reading evidence continues through `/evidence` with authenticated scope.

The original `/delivery/...` write routes, body-selected `userId`, bare arrival calls and
forced trip-complete write are intentionally superseded. Do not call those payloads from
the later Driver frontend. The canonical outcome workflow derives trip completion from
all active stops and required review, rather than allowing an arbitrary completion call.
Delivery/Sync do not maintain a second Prisma write implementation or SyncAction ledger.

UsersModule remains the dependency for Auth's login lookups. TripsModule registers the
authenticated profile controller so that adding guards does not create an Auth–Users
module cycle. No schema or migration changes are required.

## Verification

Unit tests cover Colombo midnight, ignoring a caller-selected future date, own-driver
identity, unassigned vehicles and terminal progress. PostgreSQL HTTP scenarios cover
profile role guards and secrecy, scoped delivery aliases, actor-scoped action lookup,
progress, existing partial/recovery accounting, replay and stale-plan evidence. The
four-role Chromium suite exercises offline capture, reload and reconnect on the mounted UI.
