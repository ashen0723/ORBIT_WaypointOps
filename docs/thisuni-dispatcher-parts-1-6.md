# Thisuni — Dispatcher parts 1–6

## Starting audit

Base commit: `3e8c577`. Working tree was clean when this work began.

| Part | Starting state | Work required |
|---|---|---|
| 1. Seven screens | Prototype pages exist; root mounts the shared OperationsApp instead | Mount a guarded Dispatcher router and real Dashboard, Orders Queue, Planning, Vehicles, Trip View, Deferred Orders and Operations Status |
| 2. Actual API data | Orders/vehicles/trips/detail APIs exist; prototype contexts still use mocks | Typed shared client, paginated queries, filters, detail view, cancellation/race protection, genuine loading/empty/error states |
| 3. Planning | Backend transactions implemented; shared workspace combines draft+allocate | Separate save/validate/allocate/publish, recover saved work, add/remove/reorder stops, live capacity totals, amendment handoff |
| 4. Validation | Backend has structured reasons; shared form flattens them | Show reason code/context/actual/limit and retain draft through rejection or lost network response |
| 5. Deferrals/monitoring | Backend history/loading/delivery/conflict APIs exist | Valid calendar dates, reason/history, actionable loading issues and live driver/delivery exceptions |
| 6. Shared components | Old UI components and live forms differ | Common buttons, tables, modal focus behavior, badges, async states, auth/API and mutation patterns |

The earlier `output/thisuni-part1-part2` package is an uninstalled handoff reference; its comments about
missing endpoints predate the connected workflow commit. Use current API contracts and server code.

## Implementation boundaries

New live Dispatcher code lives under `features/dispatcher/live`. Reuse the green/white visual language
and the existing Button primitive. Preserve legacy mock screens for reference and keep Loader, Driver
and Store on their currently tested shared workspace. Do not introduce mock fallbacks into live screens.
Server business validation remains authoritative; client previews cannot authorize allocation.

Work through parts 1–6, with supporting API reads where the current contracts lack a screen requirement.
Part 7 is exercised as a regression check (published trips reach Loader; Driver facts reach monitoring).
Part 8 needs real team contributions/recording coordination; do not invent AI usage or contact teammates.

## Completion record

| Part | Implemented result | Main files |
|---|---|---|
| 1 | Dedicated authenticated Dispatcher shell, seven navigation entries and individual Trip View; responsive desktop/mobile layout | `DispatcherApp.tsx`, `ReadPages.tsx`, `TripDetail.tsx`, `dispatcher.css` |
| 2 | Actual paginated orders, vehicles, trips, saved drafts, outlet/calendar metadata, details and histories; date/depot/search/status/brand filters | `live/api.ts`, `api/useQuery.ts`, `ReadPages.tsx`, `OrderDetails.tsx` |
| 3 | Add/remove orders, explicit up/down stop ordering, vehicle/departure selection, authorized retry load totals, separate Save → Validate → Allocate → Publish; restore local working copy and server drafts | `PlanningWorkspace.tsx`, `planning-model.ts` |
| 4 | Every backend validation reason with context and actual/limit values; invalid plans remain saved; editing invalidates the previous validation; allocation revalidates transactionally | `PlanningWorkspace.tsx`, shared `ErrorPanel`, planning engine |
| 5 | Eligible date selection and reason/history; loading shortfall decisions, delivery evidence/recovery review, rescheduling and stale offline conflict review; Trip/Operations polling every 15 seconds while visible | `OrderDetails.tsx`, `TripDetail.tsx`, `ReadPages.tsx` |
| 6 | Shared Button, Panel, DataTable, Modal, Badge, async states and role guard; typed API client, abortable reads, mutation mutex and actor-scoped persistent idempotency intents; shared authenticated evidence gallery | `components/shared`, `api/client.ts`, `api/useQuery.ts`, `live/api.ts` |

All paths in the last column are relative to `apps/web/src/features/dispatcher` unless a shared folder is named. The live module is under `live/`.

## Supporting API contracts

- `GET /planning/drafts`: caller-created drafts with pagination. `PlanDraftView.allocatedTripId` lets a reload recover allocation after a committed server response is lost.
- `GET /outlets`: paginated outlet reference metadata.
- `GET /planning/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&outletId=...`: configured operating dates, excluding Sunday and respecting STYLE's configured weekday. Maximum range is 366 days; UI requests the next 180 days.
- Dispatcher order views include outlet/depot names and `planningLoad`: exact authorized next-attempt units, weight, volume and lines. Unknown historical factors/ledger states remain unavailable; UI does not substitute original order totals for retries.
- `GET /deliveries/:id/recovery`: authoritative undecided balance and recovery decision history. Only Dispatcher can read this endpoint.
- Deferral/recovery/reschedule and planning validation now consistently enforce Sunday and STYLE weekday restrictions.
- Existing mutations still use expected versions, `clientActionId`, server-side role checks and database transactions. No schema migration was added.

## Verification

- `npm run typecheck`: contracts and the reachable live frontend pass.
- `npm test`: 62 tests pass (40 API, 22 frontend).
- `npm run build`: web production bundle and Nest backend compile.
- Native PostgreSQL integration: all four migrations applied to an isolated test schema; existing allocation/concurrency/shortfall/recovery/reschedule suites pass. New HTTP checks cover real planning-load previews (20 original units vs 2 retry units), paginated eligible dates, Sunday/STYLE restrictions and role denial for calendar/recovery/draft reads.
- Chromium exercises all seven Dispatcher screens, real filters/order details, dialog Escape/focus restoration, add/remove/reorder, six blocked-assignment reasons, draft persistence after reload, lost allocation response recovery, explicit publication, deferral reason/history, error/retry/empty states and mobile horizontal-overflow checks.
- Four-role regression exercises Store order → Dispatcher publication → Loader acknowledgment/loading → Driver offline image capture/reload/reconnect → Store receipt. Operations Status reads the actual completed Driver result.
- Browser screenshots inspected at desktop and 390px mobile widths. Tests use reference fixtures in a disposable database, never the developer's working database.

## Handoff and remaining boundaries

Start at `/dispatcher` using a real Dispatcher account. Select the run/depot, then open Orders Queue or Planning Workspace. Save a draft before validating; fix displayed reasons and save/validate again. Allocate reserves the plan, while Publish exposes it to Loader. Open the trip for loading decisions, delivery evidence, recovery and rescheduling. Operations Status refreshes periodically; other lists have refresh controls.

Stop reordering uses accessible up/down buttons. Map routing/optimization and drag-and-drop parity with the old mock designs are outside these six requirements. Changes to an already allocated route are not edited through the draft editor; Trip View supports release with backend reconciliation guards, after which a new plan can be created. Loader, Driver and Store retain their previously integrated workspace. Legacy mock modules remain unmounted and retain their separate prototype type-check debt.

Part 7's publication/Driver monitoring path is covered as a regression here. Part 8 still requires the team's actual AI usage disclosures and a coordinated demo recording; neither has been fabricated or sent to teammates. No commit or push was made.
