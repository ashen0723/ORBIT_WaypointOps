# Waypoint PDF demo runbook

## Start the fixed local application

From the repository root, using the existing local environment file:

```sh
export PATH="$HOME/.docker/bin:$PATH"
docker compose --env-file .env.docker.local -p waypoint-ui-test up --build -d --wait --wait-timeout 240
docker compose --env-file .env.docker.local -p waypoint-ui-test ps
```

Open http://localhost:8080/login. Use a separate browser profile/private context for each role. Do not run `down -v`; it deletes persistent database volumes. Existing seed accounts retain their existing passwords. On a fresh default demo seed the password is `waypoint-demo`; a configured `SEED_DEMO_PASSWORD` overrides it.

| Role | Seed account for this scenario |
|---|---|
| Store — van-only OUT-003 | `store3@waypoint.lk` |
| Dispatcher | `dispatcher@waypoint.lk` |
| Loader — DEP-PLG | `loader@waypoint.lk` |
| Original van VAN-012 Driver | `driver2@waypoint.lk` |
| Replacement van VAN-015 Driver | `driver3@waypoint.lk` |

Check the vehicles are available for the selected date and have a free trip slot/fuel before recording. Existing database work can consume availability; do not erase existing trips to force the demo.

## Eight-minute scenario

1. **Store:** Place New Order → Chilled → `Fresh milk 1L (12 pack)`, quantity 10 → Submit Chilled Order. Note the server's delivery date and order ID.
2. **Dispatcher:** expand Run filters; set that delivery date and DEP-PLG. Trip Planning → add the new order. A truck must fail the van-only check. Select VAN-012, departure 05:00 → Save draft → Validate plan → Allocate trip → Publish trip.
3. **Loader:** select the same run date, open the published trip and loading list. Start loading. In **Report vehicle unavailable**, enter refrigeration failure → **Stop loading and notify Dispatcher**.
4. If any goods were already marked loaded, set each **Loaded quantity** to 0 and **Save checked quantity** after physically unloading. The backend prevents changing vehicle while goods remain loaded.
5. **Dispatcher:** Overview → **Replace Vehicle**, or open the trip. Under **Vehicle replacement**, choose VAN-015, give a reason and confirm. An unsuitable vehicle is still rejected by the server.
6. **Loader:** replacement appears within about 10 seconds, or Refresh. Start loading, record full quantities, **Acknowledge current plan**, then **Mark ready for departure**.
7. **Replacement Driver:** sign in as driver3; Refresh route / sync → open assigned trip → departure checks → **Depart — start trip**. Open the stop while online so the route/app are cached.
8. Set the browser offline (DevTools Network → Offline). **I've arrived** → **Record delivery**. Enter recipient and draw signature, then **Complete delivery**. Pending work shows “Saved on phone”; an offline page reload retains it.
9. Reconnect (Network → No throttling). The queue synchronizes automatically; if connectivity is intermittent, **Refresh route / sync** retries safely. Check the sync queue is clear.
10. **Store:** open the delivered order → Confirm Receipt. Verify arrival time, 10 handed over and signature. Select **Issue → Damaged**, enter Accepted 8 / Damaged 2 / Missing 0, add a note/photo and confirm.
11. **Dispatcher:** open the trip. Store receipt report shows the damage note/photo and 8/2/0 quantities beside the original 10-unit handover. Outstanding recovery shows 2; choose the actual team decision (close or authorize redelivery with an eligible date). The automated PDF scenario leaves this decision pending so the discrepancy can be reviewed.

The scenario intentionally does not hardcode the screenshot's old dates, totals or names. Data comes from the currently signed-in users and database.

## Automated verification

```sh
npm test
npm run typecheck
# Point this at a disposable PostgreSQL database, not a production database.
export TEST_DATABASE_URL='postgresql://test_user:test_password@127.0.0.1:55439/waypoint_test'
npm run test:demo
# Or run the complete browser/database suite:
npm run test:e2e:all
```

The URL above is an example; create a disposable database with matching credentials first. The harness applies migrations in an isolated schema and cleans up after itself. Chrome and the repository npm dependencies must be installed. The new scenario is `apps/api/test/demo-browser.scenarios.cjs`.
