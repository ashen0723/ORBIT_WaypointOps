# Driver UI handoff

The current backend delivery, sync, loading and trip controllers have no handlers.
There is no Driver API repository or persistent queue. The shared auth provider uses
Dispatcher's browser mock transport. Do not connect the old fixture IDs to the database.

`DriverApp` accepts an optional `DriverIntegration`. The production adapter belongs to
Kuru; it must provide only the signed-in driver's released READY/active trips, ordered
stops with shared TripStop/order IDs, planned and actual loaded quantities, loader flags,
assignment metadata, and cached operational records. `Loaded` is the existing UI label,
not a new server status. Map the backend enums at the adapter boundary.

The snapshot's stopRecords keys use `${tripId}-${sequence}`. This is a presentation key;
arrival/outcome submissions also carry `stopId` and `orderId` from the shared route.
Never substitute fixture IDs in connected mode. No integration means an explicitly
labelled volatile demo. Refresh loses demo changes; there is no claim of local storage.

`submit` must resolve only after server acceptance or a durable local queue save. Return
`Saved on phone`/`Pending` for durable queued work, `Synced` for acknowledged server work.
Errors must reject or return Failed/Conflict/Needs attention, and remain in the queue
snapshot with the affected action IDs and readable server message. Subscription updates
are the operational source of truth, including optimistic records accepted by the queue.
Emit Syncing, then Synced/Failed/Conflict based on real results. Retry and conflict review
must retain rejected payloads until the queue's explicit recovery policy resolves them.

Outcome payloads retain actual quantities, reason, recipient, SVG signature and actual
photo `File`s. Object URLs are previews only; the adapter must copy/upload/persist File
contents before acknowledging acceptance. It owns delivery IDs, idempotency keys, POD
upload sequencing, authentication and refresh recovery. Issue reports retain notes and
photo files. Signature/photo upload errors must not be reported as successful POD.

No receiver/outlet closed (and other failures) require a reason and zero quantities,
without recipient or signature. Full requires all planned quantities; a short load must
use partial/failed. Partial requires nonzero delivered items and an actual shortage.
Photo requirements await the shared POD contract; currently optional in the UI.

## Reproducible current demo

Login with the current shared mock Driver account and open `/driver`. Open Trip 1's
check, review the Loader flag, tick acknowledgement and depart. No stops auto-complete.
Open Stop 1, record arrival, choose Failed → Receiver unavailable → Complete delivery.
No recipient/signature is required. Continue route. For a partial outcome at the next
stop, arrive, reduce a quantity, choose a reason, enter recipient and draw a signature;
optionally select a photo. Complete and continue. Resolve remaining stops, then open
summary: full/partial/failed are separate counts.

Use browser offline network mode to see Offline while keeping the route visible. Demo
actions remain labelled Demo only, including after reconnect. A truthful saved locally →
syncing → synced/conflict walkthrough requires Kuru's adapter and Mansandi's handlers.
The regression tests inject this interface to verify queued states, shared IDs, POD
handoff, duplicate protection and server failures without fabricating backend success.
