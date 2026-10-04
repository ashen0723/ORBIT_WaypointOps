import type { CalendarDay, DepotId } from '../types/dispatch';
import { ORDER_CUTOFF } from '../data/rules';
import { addDays, colomboParts, weekday } from './clock';
import { toMin } from './time';

export function calendarEntry(calendar: CalendarDay[], date: string, depotId: DepotId): CalendarDay | undefined {
  return calendar.find((c) => c.date === date && c.depotId === depotId) ?? calendar.find((c) => c.date === date && c.depotId === 'ALL');
}

/** Explicit calendar entries win; otherwise Monday–Saturday operate and Sunday is closed. */
export function isOperatingDay(calendar: CalendarDay[], date: string, depotId: DepotId): boolean {
  const entry = calendarEntry(calendar, date, depotId);
  if (entry) return entry.operating;
  return weekday(date) !== 0;
}

export function closureNote(calendar: CalendarDay[], date: string, depotId: DepotId): string {
  const entry = calendarEntry(calendar, date, depotId);
  if (entry && !entry.operating) return entry.note;
  return weekday(date) === 0 ? 'Sunday — depots closed' : '';
}

export function nextOperatingDay(calendar: CalendarDay[], depotId: DepotId, after: string): string {
  let d = addDays(after, 1);
  for (let i = 0; i < 90; i++) {
    if (isOperatingDay(calendar, d, depotId)) return d;
    d = addDays(d, 1);
  }
  return d;
}

/** Orders before the 4 PM Colombo cutoff can go on the next operating day; later orders skip one more day. */
export function earliestDeliveryDate(calendar: CalendarDay[], depotId: DepotId, nowIso: string): string {
  const { date, time } = colomboParts(nowIso);
  const base = toMin(time) < toMin(ORDER_CUTOFF) ? date : addDays(date, 1);
  return nextOperatingDay(calendar, depotId, base);
}

export function upcomingOperatingDays(calendar: CalendarDay[], depotId: DepotId, fromInclusive: string, count: number): string[] {
  const days: string[] = [];
  let d = fromInclusive;
  for (let i = 0; i < 120 && days.length < count; i++) {
    if (isOperatingDay(calendar, d, depotId)) days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function laterOf(a: string, b: string): string {
  return a > b ? a : b;
}