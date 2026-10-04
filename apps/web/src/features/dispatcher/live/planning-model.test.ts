import { describe, expect, it } from "vitest";
import {
  emptyEditor,
  fingerprint,
  isSaved,
  moveStop,
  readEditor,
} from "./planning-model";
describe("preserved planning intent", () => {
  it("reorders without mutating or dropping selected order IDs", () => {
    const before = ["a", "b", "c"];
    expect(moveStop(before, 2, 0)).toEqual(["c", "a", "b"]);
    expect(before).toEqual(["a", "b", "c"]);
    expect(moveStop(before, 0, -1)).toEqual(before);
  });
  it("invalidates a saved/validated snapshot on route order or vehicle changes", () => {
    const state = emptyEditor("2026-10-05", "D");
    state.plan = { ...state.plan, vehicleId: "V", orderIds: ["a", "b"] };
    state.draft = {
      id: "draft",
      version: 1,
      plan: { ...state.plan, orderIds: ["a", "b"] },
      updatedAt: "now",
      allocatedTripId: null,
    };
    expect(isSaved(state)).toBe(true);
    const hash = fingerprint(state.plan);
    state.plan.orderIds = moveStop(state.plan.orderIds, 1, 0);
    expect(isSaved(state)).toBe(false);
    expect(fingerprint(state.plan)).not.toBe(hash);
    expect(state.draft.id).toBe("draft");
  });
  it("restores a working copy separately from the last saved server draft", () => {
    const state = emptyEditor("2026-10-05", "D");
    state.plan.orderIds = ["a"];
    expect(
      readEditor(JSON.stringify(state), emptyEditor("2026-10-06", "OTHER")),
    ).toEqual(state);
    expect(readEditor("{broken", state)).toEqual(state);
  });
});
