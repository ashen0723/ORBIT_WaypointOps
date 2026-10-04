import { describe, expect, it } from 'vitest';
import { mapLoaderTripDetail, mapLoaderTripSummary } from './loaderApi';

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
