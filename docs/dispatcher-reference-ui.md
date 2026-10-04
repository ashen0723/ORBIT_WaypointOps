# Dispatcher reference UI

The authenticated Dispatcher now uses the shell and overview appearance from the supplied `88ed7675-1762-4665-9037-66c65ae80b48.zip` reference. Its featured actions, action rows, metric cards and workflow strip were adapted into `apps/web/src/features/dispatcher/live/reference` and connected to the existing API.

The shell provides the rounded sidebar/header, real signed-in identity, Colombo clock, live/error status, navigation badges, next action card and mobile drawer. Run date/depot controls remain available under Run filters. They expand on operational pages.

The overview polls actual orders, trips, vehicle availability and loading exceptions. Waiting orders include all dates; trips, available vehicles, loading exceptions and recovery tasks use the selected run. Repeat deferrals exclude already assigned or completed orders. A delayed trip is an in-transit trip with a planned stop past its planned arrival; no notification or GPS state is invented. Navigation refreshes the summary after mutations.

Navigation:

- Overview: six metrics, prioritized actions, delivery/deferral workflow.
- Orders and Trip Planning: existing live order detail, deferral and draft/validate/allocate/publish workflows.
- Loading and Delivery Monitoring: filtered views of live trip progress and exception resolution.
- Deferrals and Vehicles: existing live views.
- Capacity Forecast: selected-date waiting demand versus one run per completely free vehicle. Individual plan validation remains authoritative for fuel, temperature, docking, travel windows and second trips.
- History: delivered/received orders with existing detail and attempt history.
- System Checks: data-access status and offline action reconciliation.

Legacy `/trips`, `/operations` and `/deferred` links remain available. No database migration or new production dependency is required.

Validation:

```sh
npm run typecheck -w @waypoint/web
npm test -w @waypoint/web
npm run build -w @waypoint/web
DISPATCHER_UI_E2E=1 TEST_DATABASE_URL=<disposable-postgres-url> node apps/api/test/planning.integration.cjs --postgres
```

The browser scenario requires Chrome and a built API. It uses an isolated database schema and checks live overview/navigation, save/validate/allocate/publish, read-error retry and mobile navigation.
