# Driver integration seam

`DriverApp` takes an optional `DriverIntegration` (`driver.ts`). The Driver role mounts it through
`LiveDriverApp`, which supplies `LiveDriverIntegration` (`live.ts`) built from the signed-in session. Without an
integration the UI runs an explicitly labelled, in-memory demo (refresh loses its changes).

- `live.ts` — adapter: route/profile/order fetch + IndexedDB cache, durable outbox, evidence upload, sync, retry and
  conflict review. Departure is online-only.
- `mapping.ts` — the only place backend enums and shapes become UI labels (`TripStatus`/`StopStatus` → `DeliveryStatus`,
  outcomes, loader flags).
- `signature.ts` — SVG signature → PNG for the evidence API.

Contract for any implementation of `DriverIntegration`:

- `submit` resolves only after server acceptance or a durable local save; it returns `Saved on phone`/`Pending` for
  queued work and `Synced` for acknowledged work, and rejects with a readable message otherwise.
- `subscribe` listeners fire whenever the snapshot changes; the snapshot is the operational source of truth, including
  optimistic records for queued actions.
- Stop record keys are `${tripId}-${sequence}` (presentation only); submissions carry the shared `stopId`/`orderId`.

Behaviour, limitations and the repeatable offline test are in [docs/driver-offline.md](../../../../../../docs/driver-offline.md).
