import type { Prisma } from '../generated/prisma/client';
import { fail } from '../common/api-error';
import { quantities, type PlannedQuantity } from './quantity-plan';
export const recoveryInclude = { stop: { include: { lines: true } }, receipt: { include: { lines: true } }, recoveryDecisions: true };
export type RecoveryDelivery = Prisma.DeliveryGetPayload<{ include: typeof recoveryInclude }>;
/** Available quantities are per attempt. Warehouse cancellations never enter this balance. */
export function recoveryBalance(delivery: RecoveryDelivery): PlannedQuantity[] {
  if (!['DELIVERED', 'PARTIAL', 'FAILED'].includes(delivery.outcome) || !delivery.stop.lines.length) fail(409, 'DELIVERY_NOT_RECONCILED', 'Delivery needs terminal outcome and per-attempt quantities.');
  const receipt = delivery.receipt?.status !== 'PENDING' ? delivery.receipt : null;
  if (receipt && (!receipt.confirmedAt || receipt.lines.length !== delivery.stop.lines.length || receipt.lines.some(r => !delivery.stop.lines.some(l => l.orderLineId === r.orderLineId)))) fail(409, 'RECEIPT_NOT_RECONCILED', 'Receipt lines must match this delivery attempt.');
  const prior = new Map<string, number>();
  for (const record of delivery.recoveryDecisions) {
    const decision = record.decision as { action?: string; lines?: unknown };
    if (!['REDELIVER', 'CLOSE_WITHOUT_REDELIVERY'].includes(decision.action ?? '')) fail(409, 'RECOVERY_NOT_RECONCILED', 'Historical recovery decision is invalid.');
    for (const l of quantities(decision.lines)) {
      if (!delivery.stop.lines.some(line => line.orderLineId === l.orderLineId) || l.qty === 0) fail(409, 'RECOVERY_NOT_RECONCILED', 'Historical recovery references an invalid attempt line.');
      prior.set(l.orderLineId, (prior.get(l.orderLineId) ?? 0) + l.qty);
    }
  }
  const handedOver = delivery.stop.lines.reduce((sum, l) => sum + (l.deliveredQty ?? 0), 0);
  const returned = delivery.stop.lines.reduce((sum, l) => sum + (l.returnedQty ?? 0), 0);
  if ((delivery.outcome === 'PARTIAL' && (handedOver <= 0 || returned <= 0)) || (delivery.outcome === 'DELIVERED' && handedOver <= 0)) fail(409, 'DELIVERY_NOT_RECONCILED', 'Outcome does not match the recorded handover/return quantities.');
  if (receipt?.status === 'CONFIRMED' && receipt.lines.some(l => l.damagedQty > 0 || l.missingQty > 0)) fail(409, 'RECEIPT_NOT_RECONCILED', 'A discrepancy receipt must be confirmed with an issue.');
  return delivery.stop.lines.map(line => {
    const { loadedQty, deliveredQty, returnedQty } = line;
    if (loadedQty === null || deliveredQty === null || returnedQty === null || deliveredQty < 0 || returnedQty < 0 ||
        deliveredQty + returnedQty !== loadedQty || loadedQty !== line.plannedQty - line.cancelledQty ||
        (delivery.outcome === 'FAILED' && deliveredQty !== 0) || (delivery.outcome === 'DELIVERED' && returnedQty !== 0)) fail(409, 'DELIVERY_NOT_RECONCILED', 'Delivered plus returned must equal the approved load for this attempt.');
    const receiptLine = receipt?.lines.find(r => r.orderLineId === line.orderLineId);
    if (receiptLine && (receiptLine.acceptedQty + receiptLine.damagedQty + receiptLine.missingQty !== deliveredQty || Math.min(receiptLine.acceptedQty, receiptLine.damagedQty, receiptLine.missingQty) < 0)) fail(409, 'RECEIPT_NOT_RECONCILED', 'Receipt counts must reconcile to recorded handover, excluding returned goods.');
    const qty = returnedQty + (receiptLine ? receiptLine.damagedQty + receiptLine.missingQty : 0) - (prior.get(line.orderLineId) ?? 0);
    if (qty < 0) fail(409, 'RECOVERY_NOT_RECONCILED', 'Recovery exceeds the reconciled outstanding balance.');
    return { orderLineId: line.orderLineId, qty };
  });
}
