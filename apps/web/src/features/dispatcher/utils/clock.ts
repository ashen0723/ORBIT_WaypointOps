import { COLOMBO_OFFSET_MIN } from '../data/rules';
import { to12h } from './time';

/** Asia/Colombo is a fixed UTC+05:30 offset (no daylight saving), so the conversion is exact. */
export function colomboParts(at: Date | string): {date: string;time: string;} {
  const ms = (typeof at === 'string' ? Date.parse(at) : at.getTime()) + COLOMBO_OFFSET_MIN * 60000;
  const iso = new Date(ms).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function colomboToIso(date: string, time: string): string {
  return new Date(Date.parse(`${date}T${time}:00Z`) - COLOMBO_OFFSET_MIN * 60000).toISOString();
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Monday of the ISO week containing `date`. */
export function weekStart(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const SHORT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-10-05" → "Mon 5 Oct" */
export function formatDate(date: string, style: 'short' | 'long' = 'short'): string {
  return (style === 'long' ? LONG : SHORT).format(new Date(`${date}T00:00:00Z`)).replace(',', '');
}

/** ISO timestamp → "Mon 5 Oct, 4:12 PM" in Colombo time. */
export function formatDateTime(iso: string): string {
  const { date, time } = colomboParts(iso);
  return `${formatDate(date)}, ${to12h(time)}`;
}

export function formatClock(iso: string): string {
  return to12h(colomboParts(iso).time);
}