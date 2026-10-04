import type { LoadingView, Page, TripView } from "@waypoint/contracts";
export type LoaderCall = <T>(
  path: string,
  body?: unknown,
  method?: string,
) => Promise<T>;
export async function loadQueue(call: LoaderCall, date: string) {
  let cursor: string | null = null;
  const trips: TripView[] = [];
  const seen = new Set<string>();
  do {
    const page: Page<TripView> = await call(
      `/loader/trips?date=${encodeURIComponent(date)}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    trips.push(...page.items);
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor))
      throw new Error("Loading queue pagination did not advance. Retry.");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return Promise.all(
    trips.map((t) =>
      call<LoadingView>(`/trips/${encodeURIComponent(t.id)}/loading`),
    ),
  );
}
export function queueState(load: LoadingView) {
  if (
    ["READY", "IN_TRANSIT", "COMPLETED", "COMPLETED_WITH_EXCEPTIONS"].includes(
      load.trip.status,
    )
  )
    return "completed";
  if (load.issues.some((i) => i.status !== "RESOLVED")) return "issues";
  return "queue";
}
