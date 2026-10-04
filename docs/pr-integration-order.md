# Remaining PR integration order

Reviewed with main `eeed3ff`: #12 Loader and #7 Driver presentation are now merged.
The open PRs are #3 and #14; no remote merges were performed by this task.

| Order | PR / branch | Required work before merge |
|---|---|---|
| 1 | #3 `mansi` | Prepared locally: landing and live login with current schema/auth/workflow preserved; source-reference Store UI remains unmounted. |
| 2 | #14 `feature/docker-deploy` | Review against the integrated tree; validate container startup, migration deployment and browser/API connectivity. |

Follow-ups outside the remaining PR sequence: #9 still has duplicate fleet route ownership
and an unguarded vehicle detail endpoint. #7's prototype needs a verified backend/outbox
adapter before replacing the mounted Driver OperationsApp. Interrupted adapter edits are
preserved as described in `landing-login-integration.md`.

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

## #11 verification

The Driver reconciliation passed 196 tests (153 API, 43 web), contract/live frontend and
Prisma type checks, both production builds, and disposable PostgreSQL + Chromium four-role
and Dispatcher flows. New real HTTP assertions cover authenticated Driver reads, outlet
scope, action ownership and progress. The unchanged canonical flows also verify partial
receipts/recovery, evidence, stale-plan conflicts and offline reload/replay. Changes are
staged on `feature/mansandi`; no commit, push or remote merge was performed.

## #12 verification

The Loader reconciliation passed 208 unit/HTTP tests (153 API, 55 web), mounted app/contract
and Prisma type checks, and both builds. The isolated PostgreSQL/Chromium suite passed with
the dedicated Loader UI: persisted photo bytes, blocked readiness, Dispatcher replacement,
refreshed issue version, checked replacement/acknowledgement, completed loads, mobile layout,
and the complete delivery/receipt/offline replay lifecycle. Original prototype sources remain
design references; the mounted app uses the documented shared-contract implementation.
See `loader-integration.md`. No commit, push or remote merge was performed.

## #3 verification

Reconciled with main `eeed3ff`. Passed 233 unit/HTTP tests (153 API, 80 web), live app,
contract and Prisma type checks, both production builds, isolated PostgreSQL/Chromium
four-role workflows and fresh migration/seed/importer replay. Public-page browser checks
include loaded image assets, mobile overflow, invalid credentials and password visibility.
Changes are prepared on `mansi`; no commit, push or remote merge was performed for #3.
