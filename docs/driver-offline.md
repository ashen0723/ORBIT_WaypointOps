# Driver integration and offline support

Owner: Kuru (workflow §14). Code: `apps/web/src/features/driver/integration/` (`live.ts`, `mapping.ts`,
`signature.ts`), the shared outbox `apps/web/src/features/operations/offline.ts`, and `LiveDriverApp.tsx`.

The Driver role (`/driver`) now runs the Day-5 Driver UI on live API data. `LiveDriverIntegration` implements the
`DriverIntegration` interface that the UI already consumes, so the screens only see UI labels and shared IDs.

## What works offline

| Action | Offline behaviour | Server call when online |
|---|---|---|
| View today's route, stops, items, loader flags | Read from the IndexedDB cache of the last successful fetch | `GET /driver/trips`, `GET /orders/:id`, `GET /users/driver/:id/profile` |
| Record arrival | Saved to the outbox, shown as *Saved on phone* | `POST /sync/actions` (`ARRIVE`) |
| Record outcome (full / partial / failed) + POD | Saved with the signature PNG and photo bytes, shown as *Saved on phone* | `POST /evidence` per image, then `POST /sync/actions` (`OUTCOME`) |
| Report an issue (+ photos) | Saved to the outbox | `POST /evidence`, then `POST /sync/actions` (`ISSUE`) |
| **Depart** | **Not available offline** — the server has no queued depart action. The UI shows a clear error. | `POST /trips/:id/depart` |

Rules the adapter guarantees:

- **Durable before acknowledged.** The UI is told *Saved on phone* only after the IndexedDB transaction that holds the
  action *and its image bytes* commits. A refresh or closed tab keeps it.
- **Exactly once.** Each action gets one `clientActionId` when it is queued; every retry re-sends the same key and the
  server's idempotency ledger replays the original result.
- **In order.** Actions replay in capture order. If one fails or conflicts, later actions for the same stop (or trip,
  for issues) wait, so an outcome is never sent ahead of its arrival.
- **Nothing silently discarded.** Network/5xx errors stay *Pending* and retry on the next sync (on reconnect, on every
  new action, or *Retry action*). A 4xx (e.g. rejected image) becomes *Failed* and stays visible with the server message.
  A stale plan becomes *Conflict*; the server keeps the recorded facts for Dispatcher review and the driver taps
  *Acknowledge review* to clear it from the phone. Synced entries are removed only after the server route is re-fetched.
- **Rejected work never looks done.** A failed or conflicting outcome keeps the server's stop status; only queued or
  synced outcomes show the stop as resolved.
- **Evidence is real.** The signature SVG is rasterised to PNG; photos must be PNG/JPEG/WebP under 10 MB (checked before
  queueing). Images upload before the action that references them; an upload failure never marks the stop complete.

POD rules enforced in the UI to match the API contract: full and partial need recipient and signature; failed needs a
reason, zero handover and **one photo**; a partial with damage needs a photo. Delivered + returned must equal the loaded
quantity on every line.

## Known limitations

- Departure needs a connection.
- Outlet names, addresses, windows and contacts are not exposed to the Driver role by the API, so stops show the outlet ID
  and planned arrival time. Item names come from the order lines.
- Loader flags are derived from loaded vs planned quantities on the trip lines (the loading-issue endpoint is
  Loader/Dispatcher only), so the flag says what is short, not the loader's note.
- The route cache is per signed-in driver on that browser; signing out does not clear queued actions — they sync the next
  time the same driver signs in on that device.
- Sync runs while the app is open (on load, on the browser `online` event, after each new action). There is no
  background sync while the app is closed.

## Repeatable offline test (for QA / demo)

Prerequisite: a trip assigned to `driver@waypoint.lk` that the Loader has marked READY (seed + Dispatcher publish +
Loader ready, see the judge walkthrough).

1. Sign in as `driver@waypoint.lk`, open the trip check, acknowledge any loader flag and **Depart** (online).
2. Open Stop 1 and tap **I've arrived** — the sync panel shows the arrival, then *Synced*.
3. In DevTools → Network, choose **Offline**. The banner switches to *Offline*; the route stays visible.
4. Tap **Record delivery** → *Full*, enter a recipient, sign, add a photo → **Complete delivery**. The stop shows
   *Delivered* with *Saved on phone*; the sync panel lists the outcome as *Saved on phone*.
5. **Hard refresh** (still offline). The stop and the queued outcome are still there.
6. Switch Network back to **Online**. The action moves to *Syncing* and disappears once the server confirms it; the stop
   shows *Delivered* from the server.
7. Verify downstream: Store Manager sees the delivery for confirmation; Dispatcher sees the stop delivered.
8. Duplicate check: repeating step 6 (or two tabs reconnecting) records a single delivery — the server replays the same
   `clientActionId`.

Negative checks: a *Failed* outcome cannot be completed without a photo; *Depart* while offline shows the connection
error; a HEIC photo is rejected before queueing.

Automated coverage: `apps/web/src/features/driver/integration/live.test.ts` (offline save, reload survival, ordered
replay with the same key after a lost response, evidence before action, rejected upload stays Failed, conflict review,
online-only departure, issue mapping) and `apps/web/src/features/operations/offline.test.ts`.
