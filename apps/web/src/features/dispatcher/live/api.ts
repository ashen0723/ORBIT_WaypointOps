import { useMemo } from "react";
import type { Page } from "@waypoint/contracts";
import { useAuth } from "../../../app/providers/AuthProvider";
import { ApiError, apiFetch } from "../../../api/client";
export function query(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values))
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  return params.size ? `?${params}` : "";
}
export function createDispatcherApi(
  token: string,
  actorId: string,
  expire: () => void,
) {
  async function get<T>(path: string, signal?: AbortSignal) {
    try {
      return await apiFetch<T>(path, { token, signal });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expire();
      throw e;
    }
  }
  async function all<T>(
    path: string,
    filters: Record<string, unknown> = {},
    signal?: AbortSignal,
  ) {
    const items: T[] = [];
    let cursor: string | null = null;
    const cursors = new Set<string>();
    do {
      const page: Page<T> = await get<Page<T>>(
        `${path}${query({ ...filters, limit: 100, cursor })}`,
        signal,
      );
      items.push(...page.items);
      cursor = page.nextCursor;
      if (cursor && cursors.has(cursor))
        throw new Error("The server repeated a page. Retry this view.");
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return items;
  }
  async function mutate<T>(path: string, body: object, method = "POST") {
    const signature = JSON.stringify([method, path, body]),
      storageKey = `waypoint.dispatcher.intent:${actorId}:${signature}`;
    let key = sessionStorage.getItem(storageKey);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(storageKey, key);
    }
    try {
      const result = await apiFetch<T>(path, {
        token,
        method,
        body: JSON.stringify({ ...body, clientActionId: key }),
      });
      sessionStorage.removeItem(storageKey);
      return result;
    } catch (e) {
      if (e instanceof ApiError && e.status < 500)
        sessionStorage.removeItem(storageKey);
      if (e instanceof ApiError && e.status === 401) expire();
      throw e;
    }
  }
  return { get, all, mutate };
}
export function useDispatcherApi() {
  const { token, user, expire } = useAuth();
  return useMemo(
    () => createDispatcherApi(token ?? "", user?.id ?? "", () => expire(token)),
    [token, user?.id, expire],
  );
}
export type DispatcherApi = ReturnType<typeof createDispatcherApi>;
export const colomboDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const localTime = (instant: string) =>
  new Date(instant).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
  });
