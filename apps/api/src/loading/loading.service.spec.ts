import type { PrismaService } from '../prisma/prisma.service';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  const findMany = jest.fn();
  const service = new LoadingService({ trip: { findMany } } as unknown as PrismaService);

  beforeEach(() => findMany.mockReset());

  it('returns only published work mapped for the Loader queue', async () => {
    findMany.mockResolvedValue([
      {
        id: 'TRIP-1',
        vehicleId: 'TRK-021',
        tripNo: 1,
        date: new Date('2026-10-05T00:00:00.000Z'),
        plannedDeparture: '05:30',
        status: 'CONFIRMED',
        totalWeightKg: 640,
        totalVolumeM3: 8.5,
        vehicle: {
          type: 'TRUCK',
          temp: 'REEFER',
          weightCapKg: 1000,
          volumeCapM3: 18,
        },
        loadingRecord: null,
        stops: [
          {
            id: 'STOP-1',
            orderId: 'ORD-1',
            sequence: 1,
            etaTime: '06:15',
            order: {
              outletId: 'OUT-001',
              outlet: {
                name: 'FreshMart Colombo 05',
                district: 'Colombo',
                brand: 'FRESH',
              },
            },
          },
        ],
      },
    ]);

    await expect(service.listPublishedTrips('DEP-PLG')).resolves.toEqual([
      expect.objectContaining({
        tripId: 'TRIP-1',
        vehicleId: 'TRK-021',
        status: 'READY_TO_LOAD',
        stopCount: 1,
        orderCount: 1,
        districts: ['Colombo'],
        brands: ['FRESH'],
      }),
    ]);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        depotId: 'DEP-PLG',
        status: { in: ['CONFIRMED', 'LOADING', 'READY'] },
      },
    }));
  });

  it('marks a trip with an open issue as awaiting Dispatcher action', async () => {
    findMany.mockResolvedValue([
      {
        id: 'TRIP-2', vehicleId: 'TRK-021', tripNo: 1,
        date: new Date('2026-10-05T00:00:00.000Z'), plannedDeparture: '05:30', status: 'LOADING',
        totalWeightKg: 640, totalVolumeM3: 8.5,
        vehicle: { type: 'TRUCK', temp: 'REEFER', weightCapKg: 1000, volumeCapM3: 18 },
        loadingRecord: { status: 'IN_PROGRESS', issues: [{ status: 'OPEN' }] },
        stops: [],
      },
    ]);

    const [trip] = await service.listPublishedTrips('DEP-PLG');
    expect(trip).toMatchObject({ status: 'AWAITING_DISPATCHER', openIssueCount: 1 });
  });
});
