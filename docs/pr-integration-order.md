# Remaining PR integration order

Reviewed with main `1d8d93d`: #2, #4, #8, #5, #6, #10 and #9 are merged.
No remote PRs were merged or closed during this review.

| Order | PR / branch | Required work before merge |
|---|---|---|
| 1 | #13 `feature/storeManager` | Prepared locally: preserve main schema/auth and canonical order/receipt mutations; add scoped outlet/policy/queue/catalog endpoints. |
| 2 | #11 `feature/mansandi` | Reconcile UsersService and trip/delivery/sync route ownership; preserve auth scope, evidence and replay/conflict semantics. |
| 3 | #12 `loader` | Reconcile schema/client and Loader API/UI, mount and test the live entry point. |
| 4 | #7 `vihandu` | Connect DriverIntegration to the backend and durable outbox before replacing the mounted Driver flow. |
| 5 | #3 `mansi` | Separate unique landing/login/Store UI from duplicated auth/schema/importer/backend changes. |

Main already contains #9's duplicate Fleet `/vehicles` route and unguarded detail handler. Its merge status does not establish contract/security reconciliation; schedule a follow-up to unify these with the guarded paginated workflow fleet projection.

This is a proposed integration sequence, not permission to bulk-merge. Refresh each branch against
main after the previous merge and inspect its new diff. Backend contract reconciliation is required
before switching the corresponding role UI. #13 and #11 are both backend reconciliation steps; their
order can change if their final diffs introduce an explicit dependency. Preserve ancestry with merge
commits for the existing stacked branches. Run relevant unit/type/build checks and the four-role
PostgreSQL/Chromium flow after changes to shared authentication or workflow contracts.

## #10 verification

The resolved frontend uses the shared `LoginResponse`/`SessionUser`, current-user restoration with retry,
real bearer tokens, guarded expiry and logout races, and offline restoration for cached Driver capture.
The prototype mock-session adapter is removed. Verification passed: 158 tests (115 API, 43 web),
contract/live-app type checks, production builds, and native PostgreSQL + Chromium four-role flows
including offline Driver image capture, reload and reconnect replay. No commit or push was performed.

## #13 verification

The reconciliation passed 192 tests (149 API, 43 web), contract/live frontend and Prisma
seed/importer type checks, both production builds, and disposable PostgreSQL + Chromium
four-role and Dispatcher flows. Store alias/auth/outlet/policy checks run in the real HTTP
suite, alongside partial receipts and recovery. Fresh Prisma migration deployment and
seed/importer replay also passed against a disposable database. Changes are staged on
`feature/storeManager`; no commit, push or remote merge was performed.
