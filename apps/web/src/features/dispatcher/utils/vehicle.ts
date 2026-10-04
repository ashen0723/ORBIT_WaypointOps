import type { Order, Outlet, Temperature } from '../types/dispatch';

export const TEMPERATURE_LABEL: Record<Temperature, string> = { ambient: 'Ambient', chilled: 'Chilled', frozen: 'Frozen' };

/**
 * Single-compartment bodies: frozen goods need a freezer body, chilled goods need a chilled body,
 * ambient goods ride in ambient or chilled bodies but never in a freezer.
 */
export function temperatureCompatible(vehicle: Temperature, order: Temperature): boolean {
  if (order === 'frozen') return vehicle === 'frozen';
  if (order === 'chilled') return vehicle === 'chilled';
  return vehicle !== 'frozen';
}

export function requirementText(order: Order, outlet?: Outlet): string {
  const base = order.temperature === 'chilled' ? 'Chilled vehicle' : order.temperature === 'frozen' ? 'Freezer vehicle' : 'Ambient or chilled vehicle';
  return outlet?.vanOnly ? `${base} · van only` : base;
}