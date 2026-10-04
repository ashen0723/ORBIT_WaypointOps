import { Brand } from '../generated/prisma/client';
import { validateOrderInput } from './catalog';
import { scheduleOrder } from './operating-day';
import { OrdersService } from './orders.service';
import { ReceiptsService } from '../receipts/receipts.service';

const createInput = { clientActionId: 'action-123456', requestedDate: '2026-10-05', temp: 'AMBIENT', lines: [{ catalogItemId: 'fresh-sourdough-loaf', requestedQty: 6 }] };

describe('Store order contract', () => {
  it('uses catalogue IDs and computes server totals', () => {
    expect(validateOrderInput(createInput, Brand.FRESH)).toMatchObject({ units: 6, weightKg: 38.4, volumeM3: 0.24 });
    expect(() => validateOrderInput({ ...createInput, requestedDate: '2026-02-30' }, Brand.FRESH)).toThrow();
    expect(() => validateOrderInput({ ...createInput, outletId: 'OUT-002' }, Brand.FRESH)).toThrow();
    expect(() => validateOrderInput({ ...createInput, lines: [{ catalogItemId: 'style-canvas-tote', requestedQty: 1 }] }, Brand.FRESH)).toThrow();
  });

  it('moves a post-cutoff order to the following run', () => {
    expect(scheduleOrder('2026-10-06', new Date('2026-10-05T11:00:00Z'))).toEqual({ requestedDate: '2026-10-07', rolledOver: true });
  });

  it('does not disclose another outlet order', async () => {
    const prisma = { order: { findUnique: jest.fn().mockResolvedValue({ id: 'order-1', outletId: 'OUT-002' }) } };
    await expect(new OrdersService(prisma as never).findOne({ id: 'user-1', outletId: 'OUT-001' }, 'order-1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('Store receipt contract', () => {
  const user = { id: 'user-1', outletId: 'OUT-001' };
  const receiptInput = { clientActionId: 'receipt-123456', expectedDeliveryVersion: 1, lines: [{ orderLineId: 'line-1', acceptedQty: 14, damagedQty: 0, missingQty: 0, note: null, photoRefs: [] }] };
  const delivery = { id: 'delivery-1', version: 1, outcome: 'PARTIAL', stop: { lines: [{ orderLineId: 'line-1', deliveredQty: 14 }], order: { id: 'order-1', outletId: 'OUT-001', status: 'DELIVERED', recoveryPending: true, lines: [{ requestedQty: 20, attemptLines: [{ cancelledQty: 4, deliveredQty: 14 }] }] } }, receipt: null };

  it('rejects a version mismatch before saving a receipt', async () => {
    const prisma = { receipt: { findUnique: jest.fn().mockResolvedValue(null) }, delivery: { findUnique: jest.fn().mockResolvedValue(delivery) }, $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma) };
    await expect(new ReceiptsService(prisma as never).confirm(user, 'delivery-1', { ...receiptInput, expectedDeliveryVersion: 2 })).rejects.toMatchObject({ status: 409 });
  });

  it('rejects quantities that exceed the Driver handover', async () => {
    const prisma = { receipt: { findUnique: jest.fn().mockResolvedValue(null) }, delivery: { findUnique: jest.fn().mockResolvedValue(delivery) }, $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma) };
    await expect(new ReceiptsService(prisma as never).confirm(user, 'delivery-1', { ...receiptInput, lines: [{ ...receiptInput.lines[0], missingQty: 2 }] })).rejects.toMatchObject({ status: 400 });
  });

  it('keeps a partial order open while recovery is pending', async () => {
    const receipt = { id: 'receipt-1', status: 'CONFIRMED', confirmedAt: new Date(), lines: receiptInput.lines };
    const prisma = {
      receipt: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(receipt) },
      delivery: { findUnique: jest.fn().mockResolvedValue(delivery) },
      tripStop: { findMany: jest.fn().mockResolvedValue([{ delivery: { outcome: 'PARTIAL', receipt } }]) },
      order: { update: jest.fn() }, auditEvent: { create: jest.fn() },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
    };
    await new ReceiptsService(prisma as never).confirm(user, 'delivery-1', receiptInput);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
