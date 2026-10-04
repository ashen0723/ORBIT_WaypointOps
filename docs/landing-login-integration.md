# Landing/login integration (#3)

The signed-out root now renders the PR's landing page; `/login` renders its new login design.
Landing links navigate to login, and authenticated users are redirected to their assigned
role workspace. Protected deep links still require sign-in, role prefixes remain isolated,
and session restoration, expiry and offline Driver restoration use the existing live provider.
Email and password have explicit accessible labels; password visibility and API error states
are retained. Demo-account buttons use real authentication and require seeded accounts.
Marketing illustrations and metrics are presentation content, not live operational telemetry.

## Reconciliation

Keep main's schema, seed/importer, JWT guard/configuration, users, orders, receipts and recovery
implementations. The PR's duplicate workflow/store migrations and obsolete backend writes
are removed. Docker/environment changes that could default authentication to mock mode are
not carried into the integration. Deployment configuration is reviewed separately in #14.

The mounted roles remain DispatcherApp, OperationsApp Store, live LoaderApp and OperationsApp
Driver. The PR's alternative Store components and legacy DTO mapper remain source references;
they are not mounted and must not replace the current receipt-attempt/recovery contracts.
Likewise, merged #7 supplies Driver presentation/integration interfaces but does not by itself
provide a completed, verified production adapter. Preserve the existing working Driver UI.

## Verification

Unit/HTTP suites: 233 tests (80 web, 153 API). Mounted-app/contract and Prisma type checks,
production builds, and isolated PostgreSQL/Chromium checks cover landing/login navigation,
wrong-password feedback, password visibility, all four role logins, Loader evidence/decisions,
Driver offline replay, receipt confirmation and Dispatcher screens. The browser suite takes
landing/login screenshots and checks mobile horizontal overflow.

## Preserved interrupted work

Before #3, #7 was merged remotely while a local production-adapter experiment was incomplete.
Those unverified edits are saved outside the repository in
`/Users/ashensandeepa/Desktop/waypoint/driver-integration-wip-20261004/` (patch and live adapter).
They are not part of this commit and should not be applied without completing validation.
