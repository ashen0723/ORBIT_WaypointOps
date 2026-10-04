import { Brand } from '../generated/prisma/client';
import { validateOrderInput } from './catalog';
import { scheduleOrder } from './operating-day';
import { OrdersService } from './orders.service';
import { ReceiptsService } from '../receipts/receipts.service';

describe('Store order rules', () => {
  it('validates the outlet catalogue and computes server totals', () => {
    const order = validateOrderInput({ requestedDate: '2026-10-05', type: 'dry', items: [{ name: 'Sourdough loaf', qty: 6, unit: 'crates' }] }, Brand.FRESH);
    expect(order).toMatchObject({ units: 6, weightKg: 38.4, volumeM3: 0.24 });
    expect(() => validateOrderInput({ requestedDate: '2026-02-30', type: 'dry', items: [{ name: 'Sourdough loaf', qty: 1, unit: 'crates' }] }, Brand.FRESH)).toThrow();
    expect(() => validateOrderInput({ outletId: 'OUT002', requestedDate: '2026-10-05', type: 'dry', items: [{ name: 'Sourdough loaf', qty: 1, unit: 'crates' }] }, Brand.FRESH)).toThrow();
  });

  it('moves a post-cutoff order to the following run', () => {
    expect(scheduleOrder('2026-10-06', new Date('2026-10-05T11:00:00Z'))).toEqual({ requestedDate: '2026-10-07', rolledOver: true });
  });

  it('does not disclose another outlet order', async () => {
    const prisma = { order: { findUnique: jest.fn().mockResolvedValue({ id: 'order-1', outletId: 'OUT002' }) } };
    const service = new OrdersService(prisma as never);
    await expect(service.findOne({ id: 'user-1', outletId: 'OUT001' }, 'order-1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('Store receipt rules', () => {
  const user = { id: 'user-1', outletId: 'OUT001' };
  it('rejects receipt before delivery is completed', async () => {
    const prisma = { delivery: { findUnique: jest.fn().mockResolvedValue({
      id: 'delivery-1', outcome: 'PLANNED', stop: { order: { id: 'order-1', outletId: 'OUT001', status: 'IN_TRANSIT', lines: [] } }, receipt: null,
    }) } };
    const service = new ReceiptsService(prisma as never);
    await expect(service.confirm(user, 'delivery-1')).rejects.toMatchObject({ status: 409 });
  });

  it('rejects an issue tied to another order line', async () => {
    const prisma = { delivery: { findUnique: jest.fn().mockResolvedValue({
      id: 'delivery-1', outcome: 'DELIVERED', stop: { order: { id: 'order-1', outletId: 'OUT001', status: 'DELIVERED', lines: [{ id: 'line-1' }] } }, receipt: null,
    }) } };
    const service = new ReceiptsService(prisma as never);
    await expect(service.reportIssues(user, 'delivery-1', { issues: [{ orderLineId: 'other-line', issueType: 'missing' }] })).rejects.toMatchObject({ status: 400 });
  });
});
