import { fail } from "../common/api-error";
import { date, object, text } from "../planning/planning.input";
export { object, text };
export function count(v: unknown, name = "quantity"): number {
  if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 2147483647)
    fail(400, "INVALID_INPUT", `${name} must be a nonnegative integer.`);
  return v as number;
}
export function instant(v: unknown): string {
  const s = text(v, "capturedAt");
  date(s.slice(0, 10));
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      s,
    ) ||
    !Number.isFinite(Date.parse(s))
  )
    fail(400, "INVALID_INPUT", "A timestamp with timezone is required.");
  return new Date(s).toISOString();
}
export function list(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v) || !v.length || v.length > 1000)
    fail(400, "INVALID_INPUT", "Supply 1 to 1000 records.");
  return v.map(object);
}
export function refs(v: unknown): string[] {
  if (!Array.isArray(v) || v.length > 20)
    fail(400, "INVALID_INPUT", "Supply up to 20 evidence references.");
  return v.map((x) => text(x, "evidence reference"));
}
export function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length)
    fail(400, "INVALID_INPUT", "Duplicate line IDs.");
}
export function page(query: Record<string, unknown>) {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    fail(400, "INVALID_INPUT", "limit must be 1 to 100.");
  return {
    limit,
    cursor:
      query.cursor === undefined ? undefined : text(query.cursor, "cursor"),
  };
}
export function paged<T extends { id: string }>(items: T[], limit: number) {
  return {
    items: items.slice(0, limit),
    nextCursor: items.length > limit ? items[limit - 1].id : null,
  };
}
