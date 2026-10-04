import { describe, expect, it, vi } from "vitest";
import type { LoadingView } from "@waypoint/contracts";
import { loadQueue, queueState, type LoaderCall } from "./api";
describe("live Loader queue", () => {
  it("reads all pages before fetching scoped loading views", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "one" }], nextCursor: "one" })
      .mockResolvedValueOnce({ items: [{ id: "two" }], nextCursor: null })
      .mockResolvedValueOnce({ trip: { id: "one" }, issues: [] })
      .mockResolvedValueOnce({ trip: { id: "two" }, issues: [] });
    expect(await loadQueue(call as LoaderCall, "2026-10-05")).toHaveLength(2);
    expect(call.mock.calls.map((c) => c[0])).toEqual([
      "/loader/trips?date=2026-10-05&limit=100",
      "/loader/trips?date=2026-10-05&limit=100&cursor=one",
      "/trips/one/loading",
      "/trips/two/loading",
    ]);
  });
  it("does not silently turn a failed detail request into an empty successful queue", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "one" }], nextCursor: null })
      .mockRejectedValueOnce(new Error("Trip released"));
    await expect(loadQueue(call as LoaderCall, "2026-10-05")).rejects.toThrow(
      "Trip released",
    );
  });
  it("stops a repeated cursor", async () => {
    const call = vi.fn().mockResolvedValue({ items: [], nextCursor: "same" });
    await expect(loadQueue(call as LoaderCall, "2026-10-05")).rejects.toThrow(
      "pagination",
    );
  });
  it("keeps unresolved issues separate from completed loads", () => {
    const load = (status: string, issues: unknown[] = []) =>
      ({ trip: { status }, issues }) as LoadingView;
    expect(queueState(load("LOADING", [{ status: "OPEN" }]))).toBe("issues");
    expect(queueState(load("LOADING", [{ status: "RESOLVED" }]))).toBe("queue");
    expect(queueState(load("READY"))).toBe("completed");
    expect(queueState(load("COMPLETED_WITH_EXCEPTIONS"))).toBe("completed");
  });
});
