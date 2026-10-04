import { nextQuantities, quantityTotals, quantities, remainingLines } from './quantity-plan';
import type { OrderLine } from '../generated/prisma/client';
const line = (id: string, requestedQty: number, cancelledQty = 0, unitWeightKg: number | null = null, unitVolumeM3: number | null = null): OrderLine => ({ id, orderId: 'O', item: 'Box', unit: 'box', requestedQty, cancelledQty, loadedQty: null, deliveredQty: null, unitWeightKg, unitVolumeM3, createdAt: new Date(), updatedAt: new Date() });
describe('authorized attempt quantities', () => {
  it('takes retry authorization instead of the original requested quantity', () => {
    const order = { pendingQuantities: [{ orderLineId: 'L', qty: 2 }], lines: [line('L', 20, 4)] };
    expect(nextQuantities(order)).toEqual([{ orderLineId: 'L', qty: 2 }]);
    expect(quantityTotals({ ...order, weightKg: 40, volumeM3: 4 }, nextQuantities(order))).toEqual({ weightKg: 4, volumeM3: 0.4 });
  });
  it('preserves remaining approved quantities across release/reschedule', () => {
    expect(remainingLines([{ orderLineId: 'L', plannedQty: 20, cancelledQty: 4 }])).toEqual([{ orderLineId: 'L', qty: 16 }]);
  });
  it('does not allocate a closed empty balance or legacy cancelled balance without authorization', () => {
    expect(() => nextQuantities({ pendingQuantities: null, lines: [line('L', 20, 4)] })).toThrow();
    expect(() => quantityTotals({ weightKg: 40, volumeM3: 4, lines: [line('L', 20)] }, [])).toThrow();
  });
  it('requires explicit factors for reduced heterogeneous orders', () => {
    const order = { weightKg: 110, volumeM3: 11, lines: [line('heavy', 10), line('light', 10)] };
    expect(() => quantityTotals(order, [{ orderLineId: 'heavy', qty: 2 }])).toThrow();
    order.lines = [line('heavy', 10, 0, 10, 1), line('light', 10, 0, 1, 0.1)];
    expect(quantityTotals(order, [{ orderLineId: 'heavy', qty: 2 }])).toEqual({ weightKg: 20, volumeM3: 2 });
  });
  it.each([[{ orderLineId: 'L', qty: -1 }], [{ orderLineId: 'L', qty: 1.5 }], [{ orderLineId: 'L', qty: 1 }, { orderLineId: 'L', qty: 2 }]].map(value => [value]))('rejects invalid ledger %j', value => { expect(() => quantities(value)).toThrow(); });
});
