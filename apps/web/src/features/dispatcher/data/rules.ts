import type { DockType } from '../types/dispatch';

/**
 * Operating rules. The Challenge Booklet was not attached to this project, so these values
 * carry over from the original prototype and are documented in README.md › Assumptions.
 */
export const TIMEZONE = 'Asia/Colombo';
export const COLOMBO_OFFSET_MIN = 330;
/** Orders created at or after this Colombo time move to the following eligible operating day. */
export const ORDER_CUTOFF = '16:00';
/** Fresh-brand stops must be reached by this time. Blocking. */
export const FRESH_DEADLINE = '08:00';
export const MAX_TRIPS_PER_VEHICLE_PER_DAY = 2;
/** Depot loading time before every departure; the vehicle is occupied during it. */
export const LOADING_MIN = 30;
/** Straight-line → road distance factor and average urban speed. */
export const ROAD_FACTOR = 1.35;
export const AVG_SPEED_KMH = 28;
export const HANDLING_BASE_MIN = 10;
export const HANDLING_PER_UNIT_MIN = 0.25;
export const DOCK_EXTRA_MIN: Record<DockType, number> = { loading_dock: 0, kerbside: 10, rear_lane: 15 };
export const DOCK_LABEL: Record<DockType, string> = { loading_dock: 'Loading dock', kerbside: 'Kerbside unload', rear_lane: 'Rear lane access' };
/** Orders deferred this many times or more are flagged and planned first. */
export const REPEAT_DEFERRAL_THRESHOLD = 2;
export const SESSION_HOURS = 12;
export const DEMO_PASSWORD = 'waypoint-demo';