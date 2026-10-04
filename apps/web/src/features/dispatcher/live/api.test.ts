// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "../../../api/client";
import { createDispatcherApi } from "./api";
vi.mock("../../../api/client", async (original) => {
  const mod = await original<typeof import("../../../api/client")>();
  return { ...mod, apiFetch: vi.fn() };
});
const mock = vi.mocked(apiFetch);
beforeEach(() => {
  sessionStorage.clear();
  mock.mockReset();
});
describe("dispatcher API boundary", () => {
  it("reuses the action key after an ambiguous failure, including a remounted API client", async () => {
    const a = createDispatcherApi("token", "one", vi.fn());
    mock
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({ id: "trip" });
    await expect(
      a.mutate("/planning/allocate", { draftId: "d", expectedDraftVersion: 1 }),
    ).rejects.toThrow();
    const b = createDispatcherApi("token", "one", vi.fn());
    await b.mutate("/planning/allocate", {
      draftId: "d",
      expectedDraftVersion: 1,
    });
    expect(mock.mock.calls[0][1]?.body).toBe(mock.mock.calls[1][1]?.body);
  });
  it("loads every page with its scope and cursor, and cancels through the signal", async () => {
    mock
      .mockResolvedValueOnce({ items: [{ id: "a" }], nextCursor: "a" })
      .mockResolvedValueOnce({ items: [{ id: "b" }], nextCursor: null });
    const api = createDispatcherApi("t", "actor", vi.fn()),
      controller = new AbortController();
    expect(
      await api.all("/trips", { depotId: "D" }, controller.signal),
    ).toEqual([{ id: "a" }, { id: "b" }]);
    expect(mock.mock.calls[1][0]).toContain("cursor=a");
    expect(mock.mock.calls[1][0]).toContain("depotId=D");
    expect(mock.mock.calls[1][1]?.signal).toBe(controller.signal);
  });
  it("expires unauthorized sessions instead of using mock data", async () => {
    const expire = vi.fn();
    mock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Expired"));
    await expect(
      createDispatcherApi("t", "actor", expire).get("/trips"),
    ).rejects.toThrow("Expired");
    expect(expire).toHaveBeenCalledOnce();
  });
});
