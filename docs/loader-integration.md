# Loader integration (#12)

## Runtime entry point

`app/App.tsx` mounts `features/loader/App.tsx`, which exports the dedicated live Loader
application in `features/loader/live`. It provides queue/date/search, deep-linked trip
loading details, ordered stops, issues with Dispatcher decisions and evidence, completed
loads and the current account/depot profile. Queue reads follow every pagination cursor.
Loading/error/empty states are explicit; a failed refresh disables changes to stale data.

The PR's large prototype pages, context, DTO mapper and presentation components are retained
as design references, but are not imported by the mounted entry point. Their old raw DTOs,
local plan acknowledgement and photo-attached flags are not live API contracts. The live
screen uses shared contracts and the existing loading form instead of enabling those
unversioned mutations. This is a functional integration, not a pixel-for-pixel port of all
prototype screens. Prototype type checking remains separate from the mounted app check.

## Backend ownership

LoadingController now owns the canonical authenticated routes:

- `GET /api/trips/:id/loading` (Loader/Dispatcher)
- `POST /api/loading/:id/start`
- `PATCH /api/loading/:id/lines/:lineId`
- `POST /api/loading/:id/issues`
- `POST /api/loading/issues/:id/acknowledge`

The writes are Loader-only and enforce assigned depot/publication in DecisionsService.
Planning retains `/loader/trips`, plan acknowledgement and readiness. Dispatcher decisions
remain in DecisionsController. Duplicate controllers and the PR's parallel loading write
service were removed. All writes preserve clientActionId and expected plan/line/issue
versions; there is no body-less ready or global order-line update route.

Preserve main's schema and four migrations. Removed the unmerged duplicate acknowledgement
and evidence migrations: current LoadingIssue already stores acknowledgement and durable
photoRefs, so adding another evidenceRef or duplicate acknowledgement columns is incorrect.

## Issues, evidence and readiness

The live photo form reports MISSING or DAMAGED with available quantity and a note. Optional
PNG/JPEG/WebP images upload to `/api/evidence` first, with a stable per-intent action key;
the issue stores the returned durable reference. Failed uploads do not report a photo as
attached. LoadingIssueView now includes optional note/photoRefs for compatible consumers;
the backend always supplies them. History displays those images through authenticated reads.

Dispatcher replacement/ship-short decisions remain authoritative. Save checked quantities,
acknowledge the decision after checking goods and acknowledge the current plan before
marking ready. Backend readiness refuses open issues, unchecked quantities, pending unloads
or stale plans. Replacements do not auto-resolve a shortfall. Planned load totals are labeled
as planned; per-attempt approved, cancelled and actual checked quantities remain separate.

Refresh retrieves Dispatcher changes. No automatic polling remounts a form while the Loader
is entering data. Stale writes fail with the backend reason; refresh and review the changed
plan before retrying. Successful mutations refresh server state and reset forms to the new
versions. The same action key is retained for retries of an unchanged form submission.

## Verification

Run the mounted app/contract/Prisma type checks, `npm test` and `npm run build`. Isolated
PostgreSQL/Chromium checks cover publication to Loader, start/check/plan acknowledgement,
photo bytes persisted, blocked readiness, Dispatcher replacement, Loader acknowledgement,
completed-load navigation, mobile overflow and the full Driver/receipt/offline lifecycle.
Legacy DTO mapper unit tests are source-reference tests, not evidence of live API compatibility.
