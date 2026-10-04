import type { Prisma, OrderLine, TripStopLine } from '../generated/prisma/client';
import { fail } from '../common/api-error';
export interface PlannedQuantity { orderLineId: string; qty: number }
export function quantities(value: unknown): PlannedQuantity[] {
  if (!Array.isArray(value) || value.some(x => !x || typeof x.orderLineId !== 'string' || !Number.isInteger(x.qty) || x.qty < 0 || x.qty > 2147483647) || new Set(value.map(x => x.orderLineId)).size !== value.length) {
    fail(422, 'INVALID_QUANTITY_LEDGER', 'Stored authorized quantities require reconciliation.');
  }
  return value as PlannedQuantity[];
}
export function remainingLines(lines: Pick<TripStopLine, 'orderLineId' | 'plannedQty' | 'cancelledQty'>[]): PlannedQuantity[] {
  return lines.map(l => ({ orderLineId: l.orderLineId, qty: l.plannedQty - l.cancelledQty })).filter(l => l.qty > 0);
}
export function nextQuantities(order: { pendingQuantities: Prisma.JsonValue | null; lines: OrderLine[] }, ownLines?: TripStopLine[]): PlannedQuantity[] {
  if (ownLines) return remainingLines(ownLines);
  if (order.pendingQuantities !== null) return quantities(order.pendingQuantities);
  if (order.lines.some(l => l.cancelledQty > 0 || (l.deliveredQty ?? 0) > 0)) fail(422, 'ORDER_NOT_ELIGIBLE', 'Previously fulfilled/cancelled quantities need an explicit authorized balance.');
  return order.lines.map(l => ({ orderLineId: l.id, qty: l.requestedQty }));
}
export function quantityTotals(order: { weightKg: number; volumeM3: number; lines: OrderLine[] }, selected: PlannedQuantity[]) {
  if (!selected.some(l => l.qty > 0) || selected.some(l => !order.lines.some(o => o.id === l.orderLineId && l.qty <= o.requestedQty - o.cancelledQty))) fail(422, 'INVALID_QUANTITY_LEDGER', 'Attempt quantities exceed the uncancelled order balance or contain no goods.');
  if (selected.length === order.lines.length && selected.every(l => order.lines.find(o => o.id === l.orderLineId)!.requestedQty === l.qty)) return { weightKg: order.weightKg, volumeM3: order.volumeM3 };
  let weightKg = 0, volumeM3 = 0;
  for (const selectedLine of selected) {
    const line = order.lines.find(l => l.id === selectedLine.orderLineId)!;
    // A single-line legacy order has an exact per-unit factor; never spread a multi-line total arbitrarily.
    const w = line.unitWeightKg ?? (order.lines.length === 1 ? order.weightKg / line.requestedQty : null);
    const v = line.unitVolumeM3 ?? (order.lines.length === 1 ? order.volumeM3 / line.requestedQty : null);
    if (w === null || v === null || !Number.isFinite(w) || !Number.isFinite(v) || w < 0 || v < 0) fail(422, 'REFERENCE_DATA_MISSING', 'Reduced multi-line orders require authoritative per-line weight and volume factors.');
    weightKg += selectedLine.qty * w; volumeM3 += selectedLine.qty * v;
  }
  return { weightKg, volumeM3 };
}
