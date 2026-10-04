import type { PlanInput } from '@waypoint/contracts';
import { fail } from '../common/api-error';
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'INVALID_INPUT', 'Expected an object.');
  return value as Record<string, unknown>;
}
export function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) fail(400, 'INVALID_INPUT', `${field} must be a nonempty string (max 500).`);
  return value;
}
export function version(value: unknown, field = 'expectedVersion'): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) fail(400, 'INVALID_INPUT', `${field} must be a positive integer.`);
  return value as number;
}
export function date(value: unknown): string {
  const result = text(value, 'date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) fail(400, 'INVALID_INPUT', 'Expected a valid YYYY-MM-DD date.');
  return result;
}
export function time(value: unknown): string {
  const result = text(value, 'plannedDeparture');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(result)) fail(400, 'INVALID_INPUT', 'Expected a valid HH:MM time.');
  return result;
}
export function planInput(value: unknown): PlanInput {
  const p = object(value);
  if (!Array.isArray(p.orderIds) || !p.orderIds.length || p.orderIds.length > 100) fail(400, 'INVALID_INPUT', 'Choose between 1 and 100 orders.');
  const ids = p.orderIds.map(id => text(id, 'orderIds'));
  if (new Set(ids).size !== ids.length) fail(400, 'INVALID_INPUT', 'Order IDs must be unique.');
  return { date: date(p.date), depotId: text(p.depotId, 'depotId'), vehicleId: text(p.vehicleId, 'vehicleId'), plannedDeparture: time(p.plannedDeparture), orderIds: ids as [string, ...string[]] };
}
export function localInstant(day: string, clock: string): Date { return new Date(`${day}T${clock}:00+05:30`); }
export function weekStart(day: string): Date {
  const d = new Date(day); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d;
}
