// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedTrips,
  enqueue,
  flushQueue,
  pendingActions,
  removeAction,
  saveTrips,
  type PendingAction,
} from "./offline";
import { apiFetch } from "../../api/client";
vi.mock("../../api/client", () => ({ apiFetch: vi.fn() }));
const mock = vi.mocked(apiFetch);
// fake-indexeddb hands back Node Blobs, which jsdom's FormData rejects; the API is mocked, so record fields only.
vi.stubGlobal('FormData', class { fields = new Map<string, unknown>(); set(key: string, value: unknown) { this.fields.set(key, value); } });
const row = (id: string, actorId: string, time: string): PendingAction => ({
  id,
  actorId,
  queuedAt: time,
  tripId: "trip",
  orderId: "order",
  status: "PENDING_SYNC",
  attachments: [],
  action: {
    kind: "ARRIVE",
    stopId: "stop",
    request: { clientActionId: id, expectedPlanVersion: 1, capturedAt: time },
  },
});
beforeEach(() => mock.mockReset());
describe("durable field outbox", () => {
  it("stores image bytes before acknowledging save and isolates accounts", async () => {
    const entry = row("durable", "driver-a", "2026-10-01T01:00:00Z");
    entry.attachments = [
      { slot: "photo", blob: new Blob(["image bytes"], { type: "image/png" }) },
    ];
    await enqueue(entry);
    expect(
      (await pendingActions("driver-a"))[0].attachments[0].blob,
    ).toBeDefined();
    expect(await pendingActions("driver-b")).toEqual([]);
    await saveTrips("driver-a", []);
    expect(await cachedTrips("driver-b")).toEqual([]);
  });
  it("replays capture order instead of UUID sort and blocks dependent actions on conflict", async () => {
    await enqueue(row("z-first", "sequence", "2026-10-01T01:00:00Z"));
    await enqueue(row("a-second", "sequence", "2026-10-01T01:00:01Z"));
    mock.mockResolvedValue({
      results: [
        {
          clientActionId: "z-first",
          status: "CONFLICT",
          conflictId: "c",
          evidencePreserved: true,
          error: { message: "Stale" },
        },
      ],
    });
    await flushQueue("sequence", "token");
    expect(mock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(String(mock.mock.calls[0][1]?.body)).actions[0].request
        .clientActionId,
    ).toBe("z-first");
    const rows = await pendingActions("sequence");
    expect(rows.map((r) => r.status)).toEqual(["CONFLICT", "PENDING_SYNC"]);
  });
  it("retains an action when server acknowledgment is lost and retries the same key", async () => {
    await enqueue(row("retry", "network", "2026-10-01T01:00:00Z"));
    mock.mockRejectedValueOnce(new Error("Network lost"));
    await expect(flushQueue("network", "token")).rejects.toThrow(
      "Network lost",
    );
    expect((await pendingActions("network"))[0].status).toBe("PENDING_SYNC");
    mock.mockResolvedValue({
      results: [
        {
          clientActionId: "retry",
          status: "SYNCED",
          entityId: "stop",
          recordedAt: "now",
          replayed: true,
        },
      ],
    });
    await flushQueue("network", "token");
    expect((await pendingActions("network"))[0].status).toBe("SYNCED");
    expect((await pendingActions("network"))[0].attempts).toBe(2);
    expect(mock.mock.calls[0][1]?.body).toEqual(mock.mock.calls[1][1]?.body);
  });
  it("uploads issue photos before sending the incident with their evidence ids", async () => {
    const entry = row("issue", "issues", "2026-10-01T01:00:00Z");
    entry.action = {
      kind: "ISSUE",
      request: {
        clientActionId: "issue",
        expectedPlanVersion: 1,
        tripId: "trip",
        stopId: null,
        capturedAt: "2026-10-01T01:00:00Z",
        type: "BREAKDOWN",
        note: "",
        photoRefs: [],
      },
    };
    entry.attachments = [{ slot: "photo", blob: new Blob(["x"], { type: "image/png" }) }];
    await enqueue(entry);
    mock
      .mockResolvedValueOnce({ evidenceId: "ev-1" })
      .mockResolvedValueOnce({
        results: [{ clientActionId: "issue", status: "SYNCED", entityId: "i", recordedAt: "now", replayed: false }],
      });
    await flushQueue("issues", "token");
    expect(JSON.parse(String(mock.mock.calls[1][1]?.body)).actions[0].request.photoRefs).toEqual(["ev-1"]);
  });
  it("removes only the named entry", async () => {
    await enqueue(row("keep", "remove", "2026-10-01T01:00:00Z"));
    await enqueue(row("drop", "remove", "2026-10-01T01:00:01Z"));
    await removeAction("drop");
    expect((await pendingActions("remove")).map((r) => r.id)).toEqual(["keep"]);
  });
});
