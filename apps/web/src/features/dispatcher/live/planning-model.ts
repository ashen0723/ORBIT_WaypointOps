import type { PlanDraftView, PlanInput } from "@waypoint/contracts";
export type EditablePlan = Omit<PlanInput, "orderIds"> & { orderIds: string[] };
export interface EditorState {
  plan: EditablePlan;
  draft: PlanDraftView | null;
  allocatedTripId: string | null;
}
export const fingerprint = (plan: EditablePlan) =>
  JSON.stringify([
    plan.date,
    plan.depotId,
    plan.vehicleId,
    plan.plannedDeparture,
    plan.orderIds,
  ]);
export function moveStop(ids: string[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
  const result = [...ids];
  const [id] = result.splice(from, 1);
  result.splice(to, 0, id);
  return result;
}
export function emptyEditor(date: string, depotId: string): EditorState {
  return {
    plan: {
      date,
      depotId,
      vehicleId: "",
      plannedDeparture: "05:00",
      orderIds: [],
    },
    draft: null,
    allocatedTripId: null,
  };
}
export function readEditor(
  raw: string | null,
  fallback: EditorState,
): EditorState {
  try {
    const s = JSON.parse(raw ?? "null");
    if (
      s?.plan &&
      ["date", "depotId", "vehicleId", "plannedDeparture"].every(
        (k) => typeof s.plan[k] === "string",
      ) &&
      Array.isArray(s.plan.orderIds) &&
      s.plan.orderIds.every((id: unknown) => typeof id === "string") &&
      (!s.draft ||
        (typeof s.draft.id === "string" &&
          typeof s.draft.version === "number" &&
          s.draft.plan)) &&
      (s.allocatedTripId === null || typeof s.allocatedTripId === "string")
    )
      return s;
  } catch {}
  return fallback;
}
export function isSaved(state: EditorState) {
  return (
    !!state.draft && fingerprint(state.plan) === fingerprint(state.draft.plan)
  );
}
