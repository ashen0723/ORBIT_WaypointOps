// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderView, TripView } from '@waypoint/contracts';
import { apiFetch } from '../../../api/client';
import { pendingActions } from '../../operations/offline';
import { LiveDriverIntegration } from './live';
import type { DeliveryDraft } from './driver';

vi.mock('../../../api/client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  },
}));
const api = vi.mocked(apiFetch);
// fake-indexeddb hands back Node Blobs, which jsdom's FormData rejects; the API is mocked, so record fields only.
vi.stubGlobal('FormData', class { fields = new Map<string, unknown>(); set(key: string, value: unknown) { this.fields.set(key, value); } });

const trip = (status: TripView['status'] = 'IN_TRANSIT', loadedQty = 10): TripView => ({
  id: 'TRIP-1', version: 3, planVersion: 2, vehicleId: 'TRK-021', driverId: 'driver', depotId: 'DEP-PLG', date: '2026-10-05', tripNo: 1,
  status, publishedAt: '2026-10-05T00:00:00Z', loaderAcknowledgedPlanVersion: 2,
  plannedDepartureAt: '2026-10-04T22:30:00Z', plannedReturnAt: '2026-10-05T02:00:00Z',
  totalWeightKg: 80, totalVolumeM3: 1.2, estimatedDistanceKm: 40, reservedFuelL: 6,
  stops: [{
    id: 'STOP-1', orderId: 'ORD-1', outletId: 'OUT001', sequence: 1, status: 'ARRIVED',
    plannedArrivalAt: '2026-10-04T23:00:00Z', arrivedAt: '2026-10-04T23:01:00Z', reschedule: null,
    lines: [{ orderLineId: 'LINE-1', version: 1, plannedQty: 10, cancelledQty: 10 - loadedQty, loadedQty, deliveredQty: null, returnedQty: null }],
  }],
});
const order: OrderView = {
  id: 'ORD-1', version: 1, outletId: 'OUT001', brand: 'FRESH', temp: 'CHILLED', requestedDate: '2026-10-05', plannedDate: '2026-10-05',
  status: 'IN_TRANSIT', units: 10, weightKg: 80, volumeM3: 1.2, activeTripId: 'TRIP-1', attemptStopIds: ['STOP-1'], recoveryPending: false,
  deferralCount: 0, deferReason: null, deferredToDate: null,
  lines: [{ id: 'LINE-1', item: 'Greek yogurt 500g', unit: 'cases', requestedQty: 10, cancelledQty: 0, deliveredQty: 0 }],
};
const photo = (type = 'image/jpeg') => ({ id: 'p', name: 'proof.jpg', url: 'blob:x', file: new File(['jpeg'], 'proof.jpg', { type }) });
const full: DeliveryDraft = { outcome: 'full', quantities: { 'LINE-1': 10 }, recipient: 'R. Perera', signature: '<svg/>', photos: [] };

/** Route the mocked API by path; returns the list of sync request bodies. */
function server(current: () => TripView, onSync?: (body: { actions: Array<{ request: { clientActionId: string } }> }) => unknown) {
  const syncBodies: Array<{ actions: Array<{ kind: string; request: Record<string, unknown> }> }> = [];
  let evidence = 0;
  api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path.startsWith('/driver/trips')) return { items: [current()], nextCursor: null };
    if (path.startsWith('/orders/')) return order;
    if (path.startsWith('/users/driver/')) return { vehicle: { id: 'TRK-021', type: 'TRUCK', temp: 'REEFER', depot: { id: 'DEP-PLG', name: 'Peliyagoda' } }, depot: null };
    if (path === '/evidence') return { evidenceId: `EV-${++evidence}` };
    if (path === '/sync/actions') {
      const body = JSON.parse(String(init?.body));
      syncBodies.push(body);
      return onSync?.(body) ?? { results: body.actions.map((a: { request: { clientActionId: string } }) => ({ clientActionId: a.request.clientActionId, status: 'SYNCED', replayed: false, entityId: 'x', recordedAt: 'now' })) };
    }
    if (path.endsWith('/depart')) return {};
    throw new Error(`Unexpected ${path}`);
  });
  return syncBodies;
}
let online = true;
let n = 0;
const adapter = (user: string) => new LiveDriverIntegration({
  user: { id: user, name: 'Driver', email: `${user}@waypoint.lk` }, token: 't', isOnline: () => online,
  rasterizeSignature: async () => new Blob(['png'], { type: 'image/png' }), newId: () => `key-${user}-${++n}`,
});

beforeEach(() => { api.mockReset(); online = true; });

describe('LiveDriverIntegration', () => {
  it('maps the server route into the Driver UI vocabulary', async () => {
    server(() => trip('READY', 8));
    const live = adapter('map');
    await live.sync();
    const snap = live.getSnapshot();
    expect(snap.trips[0]).toMatchObject({ id: 'TRIP-1', number: 1, status: 'Loaded', brand: 'Waypoint Fresh', district: 'Peliyagoda' });
    expect(snap.trips[0].stops[0]).toMatchObject({ id: 'STOP-1', orderId: 'ORD-1', outletId: 'OUT001', chilledCases: 8 });
    expect(snap.trips[0].stops[0].items[0]).toMatchObject({ id: 'LINE-1', name: 'Greek yogurt 500g', planned: 8, loaded: 8, chilled: true });
    expect(snap.trips[0].loaderFlag).toContain('Greek yogurt 500g loaded 8 of 10');
    expect(snap.departedTrips).toEqual({});
    expect(snap.assignment?.vehicle).toBe('TRK-021');
  });

  it('saves an offline outcome durably, survives a reload and syncs once with uploaded evidence', async () => {
    const bodies = server(() => trip());
    const first = adapter('offline');
    await first.sync();
    online = false;
    await expect(first.submit({ kind: 'outcome', tripId: 'TRIP-1', sequence: 1, at: '2026-10-04T23:10:00Z', delivery: { ...full, photos: [photo()] } })).resolves.toBe('Saved on phone');
    expect(bodies).toHaveLength(0);
    expect(first.getSnapshot().stopRecords['TRIP-1-1']).toMatchObject({ status: 'Delivered', syncState: 'Saved on phone' });

    // "Refresh": a new adapter instance rebuilds the pending state from IndexedDB.
    const second = adapter('offline');
    second.start()();
    await vi.waitFor(async () => expect((await pendingActions('offline')).length).toBe(1));
    await vi.waitFor(() => expect(second.getSnapshot().stopRecords['TRIP-1-1']?.status).toBe('Delivered'));

    online = true;
    await second.sync();
    expect(bodies).toHaveLength(1);
    const outcome = bodies[0].actions[0];
    expect(outcome.kind).toBe('OUTCOME');
    const delivery = outcome.request.delivery as { proof: { signatureRef: string; photoRefs: string[] }; lines: unknown[] };
    expect(delivery.proof.signatureRef).toBe('EV-1');
    expect(delivery.proof.photoRefs).toEqual(['EV-2']);
    expect(delivery.lines).toEqual([{ orderLineId: 'LINE-1', deliveredQty: 10, returnedQty: 0 }]);
    expect(await pendingActions('offline')).toEqual([]); // removed only after the server confirmed it
    await second.sync();
    expect(bodies).toHaveLength(1); // nothing re-sent
  });

  it('replays in capture order and retries with the same idempotency key after a lost response', async () => {
    let fail = true;
    const bodies = server(() => ({ ...trip(), stops: [{ ...trip().stops[0], status: 'PLANNED', arrivedAt: null }] }), () => {
      if (fail) { fail = false; throw new Error('Network lost'); }
      return undefined as unknown as never;
    });
    const live = adapter('order');
    await live.sync();
    online = false;
    await live.submit({ kind: 'arrival', tripId: 'TRIP-1', sequence: 1, at: '2026-10-04T23:00:00Z' });
    await live.submit({ kind: 'outcome', tripId: 'TRIP-1', sequence: 1, at: '2026-10-04T23:05:00Z', delivery: full });
    online = true;
    await live.sync(); // network drops on the first action
    expect(live.getSnapshot().actions.map(a => a.kind)).toEqual(['arrival', 'outcome']);
    await live.sync();
    const kinds = bodies.map(b => b.actions[0].kind);
    expect(kinds).toEqual(['ARRIVE', 'ARRIVE', 'OUTCOME']);
    expect(bodies[0].actions[0].request.clientActionId).toBe(bodies[1].actions[0].request.clientActionId);
    expect(await pendingActions('order')).toEqual([]);
  });

  it('never marks a stop complete when the photo upload is rejected', async () => {
    server(() => trip());
    const live = adapter('photo');
    await live.sync();
    api.mockImplementation(async (path: string) => {
      if (path === '/evidence') throw Object.assign(new Error('File bytes must match PNG, JPEG or WebP content type.'), { status: 422 });
      if (path.startsWith('/driver/trips')) return { items: [trip()], nextCursor: null };
      if (path.startsWith('/orders/')) return order;
      return null;
    });
    await live.submit({ kind: 'outcome', tripId: 'TRIP-1', sequence: 1, at: 'now', delivery: { outcome: 'failed', reason: 'Outlet closed', quantities: { 'LINE-1': 0 }, photos: [photo()] } });
    await live.sync();
    await vi.waitFor(async () => expect((await pendingActions('photo'))[0]?.status).toBe('FAILED'));
    expect(api.mock.calls.some(([path]) => path === '/sync/actions')).toBe(false);
    const [entry] = await pendingActions('photo');
    expect(entry.status).toBe('FAILED');
    expect(entry.message).toMatch(/PNG, JPEG or WebP/);
    expect(live.getSnapshot().stopRecords['TRIP-1-1']).toMatchObject({ status: 'Arrived', syncState: 'Failed' });
  });

  it('rejects evidence the API cannot accept before queueing', async () => {
    server(() => trip());
    const live = adapter('reject');
    await live.sync();
    const failed = { outcome: 'failed' as const, reason: 'Outlet closed', quantities: { 'LINE-1': 0 } };
    await expect(live.submit({ kind: 'outcome', tripId: 'TRIP-1', sequence: 1, at: 'now', delivery: { ...failed, photos: [] } })).rejects.toThrow(/photo/);
    await expect(live.submit({ kind: 'outcome', tripId: 'TRIP-1', sequence: 1, at: 'now', delivery: { ...failed, photos: [photo('image/heic')] } })).rejects.toThrow(/PNG, JPEG or WebP/);
    expect(await pendingActions('reject')).toEqual([]);
  });

  it('surfaces a server conflict, keeps the stop unresolved and drops it once reviewed', async () => {
    server(() => trip(), body => ({
      results: body.actions.map(a => ({ clientActionId: a.request.clientActionId, status: 'CONFLICT', conflictId: 'FC-1', evidencePreserved: true, error: { code: 'STALE_PLAN', message: 'Recorded facts preserved for review.', details: [] } })),
    }));
    const live = adapter('conflict');
    await live.sync();
    await live.submit({ kind: 'outcome', tripId: 'TRIP-1', sequence: 1, at: 'now', delivery: full });
    await vi.waitFor(() => expect(live.getSnapshot().actions[0]?.state).toBe('Conflict'));
    expect(live.getSnapshot().stopRecords['TRIP-1-1'].status).toBe('Arrived');
    await live.acknowledgeConflict(live.getSnapshot().actions[0].id);
    expect(live.getSnapshot().actions).toEqual([]);
  });

  it('requires a connection to depart and refreshes after the server accepts it', async () => {
    server(() => trip('READY'));
    const live = adapter('depart');
    await live.sync();
    online = false;
    await expect(live.submit({ kind: 'departure', tripId: 'TRIP-1' })).rejects.toThrow(/connection/);
    online = true;
    await expect(live.submit({ kind: 'departure', tripId: 'TRIP-1' })).resolves.toBe('Synced');
    const depart = api.mock.calls.find(([path]) => path === '/trips/TRIP-1/depart');
    expect(JSON.parse(String(depart?.[1]?.body))).toMatchObject({ expectedPlanVersion: 2 });
  });

  it('maps issue reports to the incident contract and requires departure', async () => {
    const bodies = server(() => trip());
    const live = adapter('issue');
    await live.sync();
    await live.submit({ kind: 'issue', tripId: 'TRIP-1', sequence: 1, reason: 'Refrigeration fault', notes: 'Reefer at 9°C', photos: [] });
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].actions[0]).toMatchObject({ kind: 'ISSUE', request: { type: 'REFRIGERATION', stopId: 'STOP-1', tripId: 'TRIP-1', note: 'Refrigeration fault — Reefer at 9°C' } });
  });
});
