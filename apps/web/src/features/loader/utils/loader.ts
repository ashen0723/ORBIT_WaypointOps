import type { LoadOrder } from '../types/loader';

export interface LoadTotals {
  expected: number;
  loaded: number;
  orderCount: number;
}

export function computeLoadTotals(orders: LoadOrder[]): LoadTotals {
  let expected = 0;
  let loaded = 0;
  for (const order of orders) {
    for (const item of order.items) {
      expected += item.expected;
      loaded += item.loaded;
    }
  }
  return { expected, loaded, orderCount: orders.length };
}

export function loadCheckPercent(totals: LoadTotals): number {
  if (totals.expected === 0) return 100;
  return Math.round(totals.loaded / totals.expected * 100);
}