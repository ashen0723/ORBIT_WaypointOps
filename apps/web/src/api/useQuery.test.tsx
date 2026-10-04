// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "./useQuery";
describe("query lifecycle", () => {
  it("aborts an old filter and ignores its late result", async () => {
    let finishOld!: (v: string) => void, signal!: AbortSignal;
    const old = new Promise<string>((r) => {
      finishOld = r;
    });
    const { result, rerender } = renderHook(
      ({ key }) =>
        useQuery(key, (s) =>
          key === "old" ? ((signal = s), old) : Promise.resolve("new data"),
        ),
      { initialProps: { key: "old" } },
    );
    rerender({ key: "new" });
    await waitFor(() => expect(result.current.data).toBe("new data"));
    expect(signal.aborted).toBe(true);
    await act(async () => finishOld("old data"));
    expect(result.current.data).toBe("new data");
  });
  it("retains known data and exposes a failed refresh instead of showing a fake empty result", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(["order"])
      .mockRejectedValueOnce(new Error("Offline"));
    const { result } = renderHook(() => useQuery("same", load));
    await waitFor(() => expect(result.current.data).toEqual(["order"]));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.data).toEqual(["order"]);
  });
});
