import type { DeferralReason } from '../types/dispatch';

/** Reasons a dispatcher can pick. System reasons (not_loaded, delivery_failed) are set automatically. */
export const deferralReasons: {value: DeferralReason;label: string;}[] = [
{ value: 'no_vehicle', label: 'No vehicle available' },
{ value: 'capacity', label: 'Not enough capacity' },
{ value: 'window', label: 'Can’t reach the delivery window' },
{ value: 'vehicle_requirement', label: 'Needs a vehicle we don’t have free' },
{ value: 'store_closed', label: 'Store closed or asked to wait' },
{ value: 'other', label: 'Other reason' }];


export const DEFERRAL_REASON_LABEL: Record<DeferralReason, string> = {
  no_vehicle: 'No vehicle available',
  capacity: 'Not enough capacity',
  window: 'Delivery window unreachable',
  vehicle_requirement: 'Vehicle requirement',
  store_closed: 'Store closed',
  not_loaded: 'Missing at loading',
  delivery_failed: 'Delivery attempt failed',
  manual: 'Rescheduled by dispatcher',
  other: 'Other'
};