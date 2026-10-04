import type { LoadLine, Order, Stop, Trip, Vehicle } from '../types/dispatch';
import { departureReadiness, isTerminal, lineHasException } from './fieldOps';

export type Tone = 'success' | 'waiting' | 'attention' | 'problem' | 'info' | 'neutral';

export interface Badge {
  label: string;
  tone: Tone;
}

export const TONE_STYLES: Record<Tone, string> = {
  success: 'bg-brand-pale text-forest',
  waiting: 'bg-amber-pale text-amber-ink',
  attention: 'bg-amber text-ink',
  problem: 'bg-danger-pale text-danger-ink',
  info: 'bg-blue/10 text-blue-ink',
  neutral: 'bg-canvas text-subtle ring-1 ring-inset ring-line'
};

export const TONE_DOTS: Record<Tone, string> = {
  success: 'bg-brand',
  waiting: 'bg-amber',
  attention: 'bg-ink/70',
  problem: 'bg-danger',
  info: 'bg-blue',
  neutral: 'bg-muted'
};

export const TONE_ICON: Record<Tone, string> = {
  success: 'bg-brand-pale text-forest',
  waiting: 'bg-amber-pale text-amber-ink',
  attention: 'bg-amber-pale text-amber-ink',
  problem: 'bg-danger-pale text-danger-ink',
  info: 'bg-blue/10 text-blue-ink',
  neutral: 'bg-canvas text-subtle'
};

/* Loading */
export type LineState = 'waiting' | 'complete' | 'exception';

export function lineState(l: LoadLine): LineState {
  if (l.loadedUnits === null) return 'waiting';
  return lineHasException(l) ? 'exception' : 'complete';
}

export type LoadingState = 'loading' | 'exception' | 'ready' | 'departed';

export function tripLoadingState(trip: Trip): LoadingState {
  if (trip.status !== 'loading') return 'departed';
  const r = departureReadiness(trip);
  if (r.ready) return 'ready';
  if (r.needsAck) return 'exception';
  return 'loading';
}

export const LOADING_BADGE: Record<LoadingState, Badge> = {
  loading: { label: 'Loading', tone: 'waiting' },
  exception: { label: 'Exception to acknowledge', tone: 'attention' },
  ready: { label: 'Ready to depart', tone: 'success' },
  departed: { label: 'Departed', tone: 'info' }
};

/* Monitoring */
export type MonitorState = 'delayed' | 'on_schedule' | 'completed';

export function hasOpenDelay(stop: Stop): boolean {
  return Boolean(stop.delay && !stop.delay.resolvedAt && !isTerminal(stop));
}

export function tripMonitorState(trip: Trip): MonitorState {
  if (trip.status === 'completed') return 'completed';
  if (trip.stops.some(hasOpenDelay)) return 'delayed';
  return 'on_schedule';
}

export const MONITOR_BADGE: Record<MonitorState, Badge> = {
  delayed: { label: 'Delayed', tone: 'problem' },
  on_schedule: { label: 'On schedule', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' }
};

export function currentStop(trip: Trip): Stop | undefined {
  return trip.stops.find((s) => s.status === 'pending' || s.status === 'arrived');
}

export function stopEta(stop: Stop): string {
  return stop.revisedArrival ?? stop.plannedArrival;
}

export function stopBadge(stop: Stop): Badge {
  switch (stop.status) {
    case 'delivered':
      return (stop.damagedUnits ?? 0) > 0 ? { label: 'Delivered · damage noted', tone: 'attention' } : { label: 'Delivered', tone: 'success' };
    case 'failed':
      return { label: 'Attempt failed', tone: 'problem' };
    case 'deferred':
      return { label: 'Deferred', tone: 'attention' };
    case 'arrived':
      return { label: 'At store', tone: 'info' };
    default:
      return hasOpenDelay(stop) ? { label: `Delayed ${stop.delay?.minutes} min`, tone: 'problem' } : { label: 'Pending', tone: 'neutral' };
  }
}

/* Vehicles */
export type VehicleState = 'available' | 'on_trip' | 'loading' | 'unavailable';

export const VEHICLE_BADGE: Record<VehicleState, Badge> = {
  available: { label: 'Available', tone: 'success' },
  on_trip: { label: 'On trip', tone: 'info' },
  loading: { label: 'Loading', tone: 'waiting' },
  unavailable: { label: 'Unavailable', tone: 'problem' }
};

export function vehicleState(vehicle: Vehicle, trips: Trip[], date: string): VehicleState {
  if (vehicle.unavailable.some((u) => u.date === date)) return 'unavailable';
  const mine = trips.filter((t) => t.vehicleId === vehicle.id && t.date === date);
  if (mine.some((t) => t.status === 'on_road')) return 'on_trip';
  if (mine.some((t) => t.status === 'loading')) return 'loading';
  return 'available';
}

/* Orders */
export function orderBadge(order: Order, trip?: Trip): Badge {
  switch (order.status) {
    case 'delivered':
      return order.receipt ? { label: 'Received', tone: 'success' } : { label: 'Delivered', tone: 'success' };
    case 'partially_delivered':
      return { label: 'Part delivered', tone: 'attention' };
    case 'in_transit':{
        const stop = trip?.stops.find((s) => s.orderId === order.id);
        if (stop && hasOpenDelay(stop)) return { label: 'Delayed', tone: 'problem' };
        if (stop?.status === 'arrived') return { label: 'Driver at store', tone: 'info' };
        return { label: 'On the way', tone: 'info' };
      }
    case 'allocated':
      return { label: 'Allocated', tone: 'info' };
    default:
      return order.deferralCount > 0 ? { label: `Rescheduled${order.deferralCount > 1 ? ` ×${order.deferralCount}` : ''}`, tone: 'attention' } : { label: 'Awaiting trip', tone: 'waiting' };
  }
}