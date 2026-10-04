import type { Depot } from '../types/dispatch';

export const NOW = '06:20';
export const TODAY_LABEL = 'Saturday, 3 October';
export const DISPATCHER = { name: 'Anjali Fernando', email: 'anjali.fernando@waypoint.lk' };

export const DEPOTS: Depot[] = ['Peliyagoda', 'Kandy'];
export const MAX_TRIPS_PER_VEHICLE = 2;
export const FIRST_DEPARTURE = '07:00';
export const SECOND_DEPARTURE = '12:00';
export const MINUTES_PER_STOP = 40;

/** Daily order cutoff. Orders received before it join the current planning cycle. */
export const ORDER_CUTOFF = '16:00';
/** Fresh deliveries must be completed inside this window. */
export const FRESH_WINDOW = { start: '03:30', end: '08:00' };
/** Depot loading + return drive added to every trip. */
export const TRIP_BASE_MIN = 90;
export const FUEL_BASE_L = 10;
export const FUEL_PER_STOP_L = 16;

export const RESCHEDULE_DATES = ['Tomorrow', 'Mon 5 Oct', 'Tue 6 Oct', 'Wed 7 Oct'];