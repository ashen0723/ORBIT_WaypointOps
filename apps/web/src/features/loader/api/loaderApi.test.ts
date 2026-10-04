import { describe, expect, it } from 'vitest';
import { mapLoaderTripSummary } from './loaderApi';

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
