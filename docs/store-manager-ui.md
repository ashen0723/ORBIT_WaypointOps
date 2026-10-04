# Store Manager UI

The authenticated `/store` route now mounts the Store Manager screen set matching the supplied StockManager.zip reference, instead of the generic OperationsApp. It uses the existing sidebar, rounded green/white cards, order editor, confirmation, timeline and history components.

The production provider always uses the real API; `VITE_STORE_DATA_SOURCE` is no longer needed. Restart/rebuild both API and web when deploying these changes.

- `GET /store/context` returns the signed-in outlet name/brand and the next eligible operating day and cutoff. It uses the same `eligibleRun` rule as order creation, including STYLE weekday constraints.
- Catalog and order adapters consume paginated response envelopes. Catalogue weight/volume and units come from the server; creation consumes `CreateOrderResponse.order` and its actual scheduled date.
- Account details come from the authenticated session. Order details include submission time and the active stop's planned arrival.
- Delivery/receipt data comes from the immutable delivery endpoints. Unconfirmed handovers remain receiptable during recovery. A legacy delivery error is shown on that order without blocking other orders or catalog loading.
- Receipt confirmation posts accepted/damaged/missing quantities and durable uploaded evidence IDs. Driver evidence is loaded through authenticated access.
- History filters, sorting, responsive navigation, logout, refresh/retry, and confirmation reloads are connected. Mobile layout accommodates long database order IDs.

Vehicle positions are illustrative: there is no live GPS source. The contact panel explains that in-app messaging is not connected, and the mobile app card provides browser installation guidance rather than claiming to send a download link. Profile changes still require an administrator.

Validation:

```sh
npm run typecheck -w @waypoint/web
npm test -w @waypoint/web
npm run build -w @waypoint/api
npm run build -w @waypoint/web
STORE_BROWSER_E2E=1 TEST_DATABASE_URL=<disposable-postgres-url> node apps/api/test/planning.integration.cjs --postgres
```

The browser scenario requires Chrome and exercises real API login, scoped catalog, order creation/persistence, details/history filters, receipt confirmation and mobile layouts. The integration harness uses an isolated database schema.
