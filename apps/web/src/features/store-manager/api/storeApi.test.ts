import { describe, expect, it } from 'vitest';
import { mapOrder, nextDeliveryDateColombo } from './storeApi';

describe('Store API mapping', () => {
  it('uses the latest handover attempt for a receipt and preserves recovery state', () => {
    const order = mapOrder({
      id: 'order-1', brand: 'FRESH', temp: 'CHILLED', status: 'DELIVERED',
      requestedDate: '2026-10-05', createdAt: '2026-10-04T08:00:00Z',
      lines: [{ id: 'line-1', item: 'Milk', unit: 'cases', requestedQty: 20, cancelledQty: 4, deliveredQty: 14 }],
      attempts: [{ id: 'stop-1', lines: [{ orderLineId: 'line-1', deliveredQty: 14 }], delivery: {
        id: 'delivery-1', version: 2, outcome: 'PARTIAL', completedAt: '2026-10-05T09:00:00Z',
        pod: null, receipt: { confirmedAt: '2026-10-05T10:00:00Z' },
      } }],
      deferredToDate: null, deferReason: null, recoveryPending: true,
    });
    expect(order.items[0].qty).toBe(20);
    expect(order.items[0].deliveredQty).toBe(14);
    expect(order.deliveryId).toBe('delivery-1');
    expect(order.deliveryVersion).toBe(2);
    expect(order.receiptConfirmed).toBe(true);
    expect(order.recoveryPending).toBe(true);
  });

  it('moves orders submitted after the Colombo cutoff to the following operating run', () => {
    expect(nextDeliveryDateColombo(new Date('2026-10-05T09:59:00Z'))).toBe('2026-10-06');
    expect(nextDeliveryDateColombo(new Date('2026-10-05T10:30:00Z'))).toBe('2026-10-07');
  });
});
