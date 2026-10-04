# Remaining PR integration order

Reviewed with main `f7a46c8` (PRs #2, #4, #8, #5 and #6 already merged).
No remote PRs were merged or closed during this review.

| Order | PR / branch | Required work before merge |
|---|---|---|
| 1 | #10 `feature/frontend-auth` | Reconcile the three frontend conflicts; preserve live JWT contracts, multipart uploads and offline Driver capture. Fixes prepared locally in this merge. |
| 2 | #9 `feature/fleet-api` | No text conflicts in the simulation, but `/vehicles` duplicates the existing guarded workflow route with a different response shape. Unify endpoint ownership, pagination, fuel and availability facts before merging. |
| 3 | #13 `feature/storeManager` | Reconcile schema/seed/auth changes and duplicate order/receipt routes with the current shared contracts. Retain immutable delivery and receipt/recovery accounting. |
| 4 | #11 `feature/mansandi` | Reconcile UsersService and existing trip/delivery/sync route ownership. Add current auth/scoping to new routes; preserve durable evidence and replay/conflict semantics. |
| 5 | #12 `loader` | Reconcile schema/client conflicts and the Loader API/UI with the settled backend; explicitly mount and test its live entry point. |
| 6 | #7 `vihandu` | Connect DriverIntegration to the real backend and durable outbox before replacing the currently mounted OperationsApp Driver surface. No text conflict does not establish live integration. |
| 7 | #3 `mansi` | Separate unique landing/login/Store UI work from duplicated auth/schema/importer/backend changes, then integrate those unique changes into current routes. |

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
