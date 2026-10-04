import type { Brand } from '../types/orders';

export const TODAY = '2026-09-28';
export const WEEK_START = '2026-09-22';
export const NOW_MINUTES = 13 * 60 + 46;
export const CUTOFF_MINUTES = 16 * 60;
export const CUTOFF_LABEL = '4:00 PM';
export const OUTLET_NAME = 'Riverside Outlet';

export const MANAGER = {
  name: 'Priya Raman',
  initials: 'PR',
  email: 'priya.raman@waypoint.co',
  phone: '+1 555 0118',
  avatar: "/07f63cdd-f4d2-4d16-bfdd-708b9e657c4f.jpg"
};

export const DISPATCHER = {
  name: 'North Region Dispatch',
  phone: '+1 555 0142',
  hours: '5:00 AM – 10:00 PM daily'
};

export const CUTOFF_SCENARIO_SECONDS = {
  normal: 2 * 3600 + 14 * 60,
  under_hour: 42 * 60,
  past: 0
} as const;

export const NEXT_DELIVERY: Record<Brand, {date: string;note: string;}> = {
  Fresh: { date: '2026-09-29', note: 'Daily run · before 8:00 AM' },
  Style: { date: '2026-10-02', note: 'Weekly run · Friday' },
  Tech: { date: '2026-09-30', note: 'As-needed run' }
};