import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeliveryView, OrderView } from '@waypoint/contracts';
import { createOrder, fetchCatalog, fetchOrders, mapOrder, nextDeliveryDateColombo } from './storeApi';
const order: OrderView = { id: 'O', version: 1, outletId: 'A', brand: 'FRESH', temp: 'AMBIENT', requestedDate: '2026-10-05', plannedDate: '2026-10-06', status: 'DELIVERED', units: 10, weightKg: 20, volumeM3: 1, lines: [{ id: 'L', item: 'Milk', unit: 'cartons', requestedQty: 10, cancelledQty: 0, deliveredQty: 6 }], activeTripId: null, attemptStopIds: [], recoveryPending: true, deferralCount: 0, deferReason: null, deferredToDate: null };
const delivery: DeliveryView = { id: 'D', stopId: 'S', orderId: 'O', version: 2, outcome: 'PARTIAL', capturedAt: '2026-10-06T01:00:00Z', recordedAt: '2026-10-06T01:01:00Z', requiresDispatcherReview: false, recorded: { outcome: 'PARTIAL', reason: 'Short handover', damageReported: false, lines: [{ orderLineId: 'L', deliveredQty: 6, returnedQty: 4 }], proof: { recipientName: 'Receiver', signatureRef: 'E', photoRefs: [] } } };
afterEach(() => vi.unstubAllGlobals());
describe('Live Store integration', () => {
  it('uses actual handover quantities and the server-selected delivery date', () => {
    const mapped = mapOrder(order, [delivery]);
    expect(mapped.requestedDate).toBe('2026-10-06');
    expect(mapped.items[0].deliveredQty).toBe(6);
    expect(mapped.deliveryVersion).toBe(2);
    expect(mapped.pod?.signatureRef).toBe('E');
    expect(mapped.receiptConfirmed).toBe(false);
    expect(mapped.submittedAt).not.toContain('Invalid');
  });
  it('follows catalog and order pagination and uses API unit factors', async () => {
    const fetch = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/catalog') ? { items: [{ id: 'C', name: 'Milk', unit: 'cartons', temp: 'AMBIENT', unitWeightKg: 2, unitVolumeM3: 0.01 }], nextCursor: null } : { items: [order], nextCursor: url.includes('cursor=') ? null : 'O' })));
    vi.stubGlobal('fetch', fetch);
    expect((await fetchCatalog('jwt', 'FRESH'))[0]).toMatchObject({ brand: 'Fresh', unit: 'cartons', kg: 2, m3: 0.01 });
    expect(await fetchOrders('jwt')).toHaveLength(2);
    expect(fetch.mock.calls.some(([url]) => url.includes('cursor=O'))).toBe(true);
  });
  it('unwraps creation and preserves the idempotency key and catalog ID', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ order, receivedAt: '2026-10-04T08:00:00Z', cutoffApplied: true, schedulingMessage: 'Moved' })));
    vi.stubGlobal('fetch', fetch);
    const result = await createOrder('jwt', { brand: 'Fresh', type: 'dry', requestedDate: '2026-10-05', submittedAt: '', items: [{ id: 'new', name: 'Milk', unit: 'cartons', qty: 10 }] }, [{ id: 'C', name: 'Milk', unit: 'cartons', brand: 'Fresh', type: 'dry', kg: 2, m3: 0.01 }], 'stable-action');
    expect(result.id).toBe('O');
    expect(result.requestedDate).toBe('2026-10-06');
    expect(JSON.parse((fetch.mock.calls as unknown as [string, RequestInit][])[0][1].body as string)).toMatchObject({ clientActionId: 'stable-action', lines: [{ catalogItemId: 'C', requestedQty: 10 }] });
  });
  it('moves the fallback date after the Colombo cutoff', () => {
    expect(nextDeliveryDateColombo(new Date('2026-10-05T09:59:00Z'))).toBe('2026-10-06');
    expect(nextDeliveryDateColombo(new Date('2026-10-05T10:30:00Z'))).toBe('2026-10-07');
  });
});
