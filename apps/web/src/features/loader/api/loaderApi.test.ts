import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapLoaderTripDetail, mapLoaderTripSummary, markTripReady } from './loaderApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mapLoaderTripSummary', () => {
  it('maps the backend trip contract to a Loader queue card', () => {
    expect(mapLoaderTripSummary({
      tripId: 'TRIP-1', vehicleId: 'TRK-021', tripNo: 1,
      date: '2026-10-05', plannedDeparture: '05:30', status: 'AWAITING_DISPATCHER',
      tripStatus: 'LOADING', loadingRecordStatus: 'IN_PROGRESS',
      stopCount: 2, orderCount: 2, openIssueCount: 1,
      districts: ['Colombo'], brands: ['FRESH'],
      plannedWeightKg: 640, plannedVolumeM3: 8.5,
      vehicle: {
        type: 'TRUCK', temperature: 'REEFER',
        weightCapacityKg: 1000, volumeCapacityM3: 18,
      },
    })).toEqual(expect.objectContaining({
      tripId: 'TRIP-1', vehicleId: 'TRK-021', trip: 'Trip 1',
      brand: 'Fresh', departure: '05:30', status: 'awaiting_dispatcher',
      priority: 'High', district: 'Colombo', vehicleType: 'Truck', temperature: 'Reefer',
    }));
  });

  it('uses safe display fallbacks for an unscheduled trip without stops', () => {
    expect(mapLoaderTripSummary({
      tripId: 'TRIP-2', vehicleId: 'VAN-002', tripNo: 2,
      date: '2026-10-05', plannedDeparture: null, status: 'READY_TO_LOAD',
      tripStatus: 'CONFIRMED', loadingRecordStatus: 'NOT_STARTED',
      stopCount: 0, orderCount: 0, openIssueCount: 0,
      districts: [], brands: [], plannedWeightKg: 0, plannedVolumeM3: 0,
      vehicle: {
        type: 'VAN', temperature: 'AMBIENT',
        weightCapacityKg: 700, volumeCapacityM3: 10,
      },
    })).toMatchObject({
      departure: 'Not scheduled', brand: 'Mixed', district: 'No stops',
      status: 'ready_to_load', priority: 'Standard', vehicleType: 'Van', temperature: 'Ambient',
    });
  });

  it.each([
    ['READY_TO_LOAD', 'ready_to_load'],
    ['LOADING', 'loading'],
    ['AWAITING_DISPATCHER', 'awaiting_dispatcher'],
    ['READY_TO_DEPART', 'ready_to_depart'],
  ] as const)('maps backend status %s to %s', (status, expectedStatus) => {
    expect(mapLoaderTripSummary({
      tripId: 'TRIP-STATUS', vehicleId: 'TRK-021', tripNo: 3,
      date: '2026-10-05', plannedDeparture: '05:30', status,
      tripStatus: 'LOADING', loadingRecordStatus: 'IN_PROGRESS',
      stopCount: 1, orderCount: 1, openIssueCount: 0,
      districts: ['Colombo'], brands: ['FRESH'],
      plannedWeightKg: 100, plannedVolumeM3: 2,
      vehicle: {
        type: 'TRUCK', temperature: 'REEFER',
        weightCapacityKg: 1000, volumeCapacityM3: 18,
      },
    }).status).toBe(expectedStatus);
  });
});

describe('Loader completion API', () => {
  it('posts the persisted ready-to-depart action for the selected trip', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tripId: 'TRIP 1', tripStatus: 'READY', loadingRecordId: 'LOAD-1',
      loadingStatus: 'COMPLETED', completedAt: '2026-10-05T05:15:00.000Z',
      alreadyReady: false, shortfalls: [],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(markTripReady('loader-token', 'TRIP 1')).resolves.toMatchObject({
      tripStatus: 'READY', loadingStatus: 'COMPLETED',
    });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer loader-token');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trips/TRIP%201/ready',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );
  });
});

describe('mapLoaderTripDetail', () => {
  it('maps ordered stops, actual quantities, and persisted issues', () => {
    const mapped = mapLoaderTripDetail({
      tripId: 'TRIP-1', vehicleId: 'TRK-021', tripNo: 1,
      date: '2026-10-05', plannedDeparture: '05:30', tripStatus: 'LOADING',
      plannedWeightKg: 640, plannedVolumeM3: 8.5,
      vehicle: {
        type: 'TRUCK', temperature: 'REEFER',
        weightCapacityKg: 1000, volumeCapacityM3: 18,
      },
      loadingRecord: {
        id: 'LOAD-1', status: 'IN_PROGRESS', checkedById: 'USR-LDR',
        startedAt: '2026-10-05T04:30:00.000Z', completedAt: null,
      },
      stops: [{
        tripStopId: 'STOP-1', sequence: 1, etaTime: '06:15',
        order: {
          orderId: 'ORD-1', temperature: 'CHILLED', weightKg: 120, volumeM3: 2.5,
          outlet: {
            outletId: 'OUT-001', name: 'FreshMart Colombo 05', district: 'Colombo',
            brand: 'FRESH', dockType: 'REAR_DOCK', parkingConstraint: 'NORMAL',
            deliveryWindow: { opensAt: '04:00', closesAt: '08:00', mallWindow: null },
          },
          lines: [{
            orderLineId: 'LINE-1', item: 'Milk cases', unit: 'cases',
            expectedQty: 20, loadedQty: 16,
          }],
        },
      }],
      issues: [{
        issueId: 'ISSUE-1', orderLineId: 'LINE-1', type: 'MISSING',
        expectedQty: 20, availableQty: 16, note: 'Four unavailable',
        evidenceRef: 'uploads/issues/photo.jpg', decision: 'Ship short', status: 'SHIP_SHORT',
        acknowledgedById: 'USR-LDR', acknowledgedAt: '2026-10-05T05:00:00.000Z',
        createdAt: '2026-10-05T04:45:00.000Z', updatedAt: '2026-10-05T05:00:00.000Z',
      }],
    });

    expect(mapped.trip).toMatchObject({
      tripId: 'TRIP-1',
      orders: [{
        id: 'ORD-1', stop: 1,
        items: [{ id: 'LINE-1', expected: 20, loaded: 16, condition: 'chilled' }],
      }],
      stops: [{ id: 'STOP-1', number: 1, eta: '06:15' }],
    });
    expect(mapped.quantities).toEqual({ 'LINE-1': 16 });
    expect(mapped.issues['LINE-1']).toMatchObject({
      issueId: 'ISSUE-1',
      resolution: 'ship_short', decisionReceived: true,
      approvedShipQuantity: 16, cancelledQuantity: 4,
    });
  });
});
