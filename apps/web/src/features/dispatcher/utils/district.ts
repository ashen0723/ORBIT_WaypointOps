import type { Brand, Order } from '../types/dispatch';

/** Delivery areas grouped into their planning district. */
const AREA_DISTRICT: Record<string, string> = {
  Dehiwala: 'Colombo',
  Wellawatte: 'Colombo',
  Nugegoda: 'Colombo',
  Battaramulla: 'Colombo',
  Rajagiriya: 'Colombo',
  Kotte: 'Colombo',
  Maharagama: 'Colombo',
  Kottawa: 'Colombo',
  Homagama: 'Colombo',
  Moratuwa: 'Colombo',
  Wattala: 'Gampaha',
  Kiribathgoda: 'Gampaha',
  Kelaniya: 'Gampaha',
  'Ja-Ela': 'Gampaha',
  Ragama: 'Gampaha',
  'Kandy City': 'Kandy',
  Peradeniya: 'Kandy',
  Katugastota: 'Kandy'
};

export function districtOf(order: Order): string {
  if (order.district.startsWith('Colombo')) return 'Colombo';
  return AREA_DISTRICT[order.district] ?? order.district;
}

export interface TripGroup {
  brand: Brand;
  district: string;
}

export function tripGroup(orders: Order[]): TripGroup | null {
  const first = orders[0];
  return first ? { brand: first.brand, district: districtOf(first) } : null;
}

/** Orders that can't join a trip because their brand or district differs from it. */
export function findIncompatible(tripOrders: Order[], adding: Order[]): Order[] {
  const group = tripGroup(tripOrders.length ? tripOrders : adding);
  if (!group) return [];
  return adding.filter((o) => o.brand !== group.brand || districtOf(o) !== group.district);
}