import type {
  FieldAction,
  SyncActionsResponse,
  TripView,
} from "@waypoint/contracts";
import { apiFetch } from "../../api/client";
export interface PendingAction {
  id: string;
  queuedAt: string;
  actorId: string;
  action: FieldAction;
  orderId: string;
  tripId: string;
  attachments: {
    slot: "signature" | "photo";
    blob: Blob;
    evidenceId?: string;
  }[];
  status: "PENDING_SYNC" | "SYNCED" | "CONFLICT" | "FAILED";
  message?: string;
}
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("waypoint.live.v1", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("queue", { keyPath: "id" });
      r.result.createObjectStore("cache");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
async function write(store: string, value: unknown, key?: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, ...(key === undefined ? [] : [key]));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
async function read<T>(store: string, key?: string): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const r =
        key === undefined
          ? db.transaction(store).objectStore(store).getAll()
          : db.transaction(store).objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export const saveTrips = (actorId: string, trips: TripView[]) =>
  write("cache", trips, actorId);
export const cachedTrips = async (actorId: string) =>
  (await read<TripView[] | undefined>("cache", actorId)) ?? [];
export const pendingActions = async (actorId: string) =>
  (await read<PendingAction[]>("queue"))
    .filter((q) => q.actorId === actorId)
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
/** Resolve only after the IndexedDB transaction commits, including the image bytes. */
export const enqueue = (entry: PendingAction) => write("queue", entry);
const active = new Map<string, Promise<void>>();
export function flushQueue(actorId: string, token: string): Promise<void> {
  const old = active.get(actorId);
  if (old) return old;
  const work = async () => {
    const blocked = new Set<string>();
    for (const entry of await pendingActions(actorId)) {
      const target =
        entry.action.kind === "ISSUE" ? entry.tripId : entry.action.stopId;
      if (entry.status === "CONFLICT" || entry.status === "FAILED") {
        blocked.add(target);
        continue;
      }
      if (entry.status !== "PENDING_SYNC" || blocked.has(target)) continue;
      try {
        for (const [i, a] of entry.attachments.entries())
          if (!a.evidenceId) {
            const form = new FormData();
            form.set("clientActionId", `${entry.id}:file:${i}`);
            form.set("orderId", entry.orderId);
            form.set("tripId", entry.tripId);
            form.set("file", a.blob, "evidence");
            const uploaded = await apiFetch<{ evidenceId: string }>(
              "/evidence",
              { token, method: "POST", body: form },
            );
            a.evidenceId = uploaded.evidenceId;
            await enqueue(entry);
          }
        const action = structuredClone(entry.action);
        if (action.kind === "OUTCOME") {
          const d = action.request.delivery,
            photos = entry.attachments
              .filter((a) => a.slot === "photo")
              .map((a) => a.evidenceId!);
          if (d.outcome === "FAILED")
            d.photoRefs = photos as [string, ...string[]];
          else {
            d.proof.photoRefs = photos;
            const signature = entry.attachments.find(
              (a) => a.slot === "signature",
            )?.evidenceId;
            if (signature) d.proof.signatureRef = signature;
          }
        }
        const { results } = await apiFetch<SyncActionsResponse>(
          "/sync/actions",
          {
            token,
            method: "POST",
            body: JSON.stringify({ actions: [action] }),
          },
        );
        const result = results[0];
        if (!result) throw new Error("Sync returned no result; retry safely.");
        entry.status =
          result.status === "FAILED" && result.retryable
            ? "PENDING_SYNC"
            : result.status;
        entry.message =
          result.status === "SYNCED"
            ? "Recorded on server"
            : result.status === "CONFLICT"
              ? `Dispatcher review: ${result.conflictId}`
              : result.error.message;
        await enqueue(entry);
        if (entry.status !== "SYNCED") blocked.add(target);
      } catch (e) {
        entry.message =
          e instanceof Error ? e.message : "Waiting for connection";
        await enqueue(entry);
        throw e;
      }
    }
  };
  // Cross-tab serialization complements the server's actor-scoped idempotency ledger.
  const promise = (async () => {
    if (navigator.locks)
      await navigator.locks.request(`waypoint-sync:${actorId}`, work);
    else await work();
  })().finally(() => active.delete(actorId));
  active.set(actorId, promise);
  return promise;
}
