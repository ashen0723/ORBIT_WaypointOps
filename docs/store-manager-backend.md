# Store Manager backend

This update implements the Store Manager API in the supplied React/NestJS/Prisma monorepo. It adds JWT login, assigned-outlet access, persistent orders, server-calculated load totals, Colombo cutoff/calendar handling, receipt checks, discrepancy records, receipt photos and audit events. Dispatcher accounts can read the shared queue. The existing frontend still uses browser mock data; connecting it is the next integration step.

## Install the changed files

Extract ORBIT_Store_Manager_Backend.zip and merge its apps and docs folders into your existing ORBIT_WaypointOps root, replacing matching files. Keep the existing root lockfile and .env. This archive contains changed source files only and a new migration, not dependencies or generated builds.

The update touches shared auth, error handling, schema and seed files. Coordinate those changes with your platform/database owner before merging newer team work. It is based on the supplied ZIP, not later GitHub commits.

Open Docker Desktop, wait for its engine, then run from PowerShell at the repo root:

```powershell
cd "$env:USERPROFILE\ORBIT_WaypointOps"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run prisma:generate -w apps/api
docker compose up -d db
npm run db:deploy -w apps/api
npm run db:seed -w apps/api
npm run dev:api
```

Use Node 22 or newer. Root .env supplies DATABASE_URL and JWT_SECRET. For local uploads, set UPLOAD_DIR=./uploads; Docker uses its existing /app/uploads volume. Production JWT_SECRET must be at least 32 characters and cannot be the example placeholder. The existing seed creates demo users with password waypoint-demo.

In another terminal, npm run dev:web starts the existing mock frontend. Its mock token cannot authenticate real API requests. Use the login endpoint below for a real token.

## Verify a saved order in PowerShell

```powershell
$base = 'http://localhost:3000/api'
$loginBody = @{ email = 'store@waypoint.lk'; password = 'waypoint-demo' } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $loginBody
$headers = @{ Authorization = "Bearer $($session.token)" }
Invoke-RestMethod -Uri "$base/outlets/me" -Headers $headers
$policy = Invoke-RestMethod -Uri "$base/orders/policy" -Headers $headers
$payload = @{
  clientActionId = [guid]::NewGuid().ToString()
  requestedDate = $policy.earliestDeliveryDate
  temp = 'AMBIENT'
  lines = @(@{ item = 'Sourdough loaf'; unit = 'crates'; requestedQty = 6 })
} | ConvertTo-Json -Depth 6
$order = Invoke-RestMethod -Method Post -Uri "$base/orders" -Headers $headers -ContentType 'application/json' -Body $payload
$order | ConvertTo-Json -Depth 12
Invoke-RestMethod -Uri "$base/orders/$($order.id)" -Headers $headers
```

Re-login as dispatcher@waypoint.lk and GET /orders to see that same saved order. Re-login as store2@waypoint.lk and GET the first manager's order: it returns 404. The backend derives outlet and creator from the authenticated account, never from caller-supplied identity fields.

## Endpoints

All paths have the /api prefix. All except login require Authorization: Bearer <token>.

| Method | Path | Result |
|---|---|---|
| POST | /auth/login | {email,password} -> {token,user}; browser roles are lowercase |
| GET | /auth/me | Active account; no password hash |
| GET | /outlets/me | Manager's assigned outlet and depot |
| GET | /orders/catalog | Catalog allowed for that outlet's brand |
| GET | /orders/policy | Colombo date, 16:00 cutoff, earliest eligible delivery |
| POST | /orders | Persist a confirmed order, lines and audit |
| GET | /orders | Scoped, paginated queue: {items,total,limit,offset} |
| GET | /orders/:id | Lines, trip, vehicle, ETA, delivery/POD, receipt and timeline |
| POST | /receipts | Persist all item checks and discrepancies |
| GET | /receipts/orders/:orderId | Saved receipt, item checks and issues |
| POST | /receipts/orders/:orderId/evidence | Multipart image field photo |
| GET | /receipts/evidence/:id | Authorized photo bytes |

Manager reads are limited to their outlet. Dispatcher reads are limited to their depot when assigned, or all depots when no depot is assigned. Driver/Loader accounts cannot access the Store order queue or receipt API.

Order list filters: status, requestedDate (YYYY-MM-DD), limit (1-100) and offset. Saved DateTime fields serialize as ISO timestamps; requestedDate's first ten characters are the calendar date. OrderStatus values remain uppercase and use the existing shared schema.

## Create order contract

```json
{
  "clientActionId": "generate-a-UUID-once-per-submission",
  "requestedDate": "2026-10-06",
  "temp": "AMBIENT",
  "lines": [{"item":"Sourdough loaf","unit":"crates","requestedQty":6}]
}
```

Use /orders/catalog for exact item names, units and temperature. The server sample catalog is copied from the submitted Store design. Totals are calculated by the server; forged brand, outlet, creator, status, weight and volume fields are rejected. Quantities must be integers from 1-10,000, with 1-100 lines. Combine duplicate items. Only Fresh has chilled items. Separate ambient/chilled orders on the same day are permitted.

Retry identical payloads with the same clientActionId to return the original order; reusing it with a different payload returns 409. The identifier is optional, so clients must supply it for safe retries.

Before 16:00 Colombo, the earliest delivery is the next operating run after today. At or after 16:00, that closed run is skipped. A valid earlier future date rolls to the following eligible run; scheduling in the response preserves originalRequestedDate, effectiveDate and rolledOver. A rollover remains CONFIRMED rather than pretending it is an allocation deferral. Past/today, non-operating and unknown calendar dates are rejected. Later requested dates are retained. Exact Style weekly schedules are not present in the shared schema; no Friday-only rule is invented.

## Calendar setup

When no calendar is loaded, seed creates an explicitly labeled DEMO Monday-Saturday calendar for 400 days starting at today's Colombo date. This is a working demo fallback, not official CSV import. Import official dates privately with:

```powershell
npm run db:calendar -w apps/api -- "C:\path\to\calendar.csv"
```

The importer validates date and is_operating for the entire CSV before writing, handles quoted cells/CRLF/BOM, and upserts dates transactionally. It leaves dates outside the file intact. Alternatively provide OPERATING_CALENDAR_CSV in the API environment during seed. Datathon history may not cover the current Hackathon date; select the demo range consciously. Do not publish competition data in the public repository.

## Confirm receipt contract

Driver must first save a completed Delivery with DELIVERED or PARTIAL outcome and actual line quantities. Full delivery requires order DELIVERED; a partial delivery permits DELIVERED or IN_TRANSIT until receipt. Failed/unfinished deliveries cannot be received. Store receipt never fabricates Driver evidence.

```json
{
  "deliveryId": "saved-delivery-id",
  "checks": [
    {"orderLineId":"line-1","result":"OK","receivedQty":6},
    {"orderLineId":"line-2","result":"ISSUE","receivedQty":4,
     "issueType":"MISSING","note":"Two crates missing","evidenceId":"optional-upload-id"}
  ]
}
```

Check every line exactly once. OK requires requested quantity and agreement with recorded delivered quantity. ISSUE requires received quantity, type (MISSING/DAMAGED/WRONG_ITEM/OTHER), and note; photo is optional. ReceiptItem preserves every check. ReceiptIssue preserves notes and photo references. Receipt status becomes CONFIRMED or CONFIRMED_WITH_ISSUE; Order becomes RECEIVED while original Delivery outcome stays intact. Identical retries return the saved receipt; different checks after confirmation return 409. Transactions use serializable isolation with readable retry errors on conflicts.

### Receipt photo upload

Upload JPEG/PNG/WebP as one multipart field named photo, maximum 10 MiB. Both MIME and file signatures are checked. The fixed 10 MiB receipt limit is independent of MAX_UPLOAD_MB, which remains available to the team's other upload modules. Files use generated names in the private uploads directory. Evidence belongs to an order and uploader, and unrelated evidence cannot be attached.

```typescript
const form = new FormData();
form.append('photo', file);
const response = await fetch(`/api/receipts/orders/${orderId}/evidence`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
});
const { evidenceId } = await response.json();
```

Leave Content-Type unset for FormData. Existing apiFetch is JSON-only, so extend it or use a dedicated upload helper. Photo downloads need a Bearer token: authenticated fetch -> Blob -> object URL for preview. ReceiptIssue.photoRef stores the evidence ID. File signatures are checked; complete image decoding/antivirus and cleanup of unsubmitted photos are not implemented.

## Frontend handoff

1. Shared AuthProvider/SessionContext login must call /api/auth/login and store its real token. Coordinate with the Auth owner because Dispatcher still uses its browser mock transport. Re-login to replace old mock tokens.
2. Replace store-manager/contexts/OrdersContext.tsx seeds with GET /orders; use response.items.
3. PlaceOrder must await POST /orders instead of setTimeout. Keep its UUID while retrying; use /outlets/me, /orders/catalog and /orders/policy instead of hard-coded date/outlet.
4. Adapt backend shapes: FRESH -> Fresh, AMBIENT -> dry, IN_TRANSIT -> in_transit, RECEIVED -> receipt_confirmed, lines.item -> items.name, lines.requestedQty -> items.qty. READY needs an explicit UI state or a documented loading mapping. CONFIRMED does not mean allocated.
5. Load order detail for saved ETA, deferral, Driver POD, receipt and audit timeline. Other module owners must append their own audit transitions.
6. ConfirmReceipt sends the complete checklist, discrepancy notes and evidence references before showing success.

Store urgency/escalation requests, profile preferences and notification transport remain prototype-only. Driver, Loader and Dispatcher write endpoints remain owned by their modules. This update supplies the records and scoped read API they can share.

## Verification

```powershell
npm test -w apps/api -- --runInBand
npm run build -w apps/api
```

Database integration tests are skipped unless TEST_DATABASE_URL points to a migrated disposable PostgreSQL database. Create a separate test database and apply committed migrations using DATABASE_URL first. The suite creates and deletes its own fixtures, but leaves some calendar dates; it must not run against production.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://waypoint:change-me@localhost:5432/waypoint_test'
npm test -w apps/api -- --runInBand
Remove-Item Env:TEST_DATABASE_URL
```

Implementation verification: 23 tests passed, including 10 HTTP/database cases against disposable PGlite PostgreSQL-compatible storage. Both SQL migrations applied and NestJS build passed. Docker Compose and PostgreSQL 16 were unavailable here and must be checked by the team. The single-connection test adapter does not verify multi-connection concurrency under PostgreSQL 16.
