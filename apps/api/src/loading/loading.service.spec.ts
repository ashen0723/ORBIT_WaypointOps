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

  it('returns ordered loading detail with actual quantities and issues', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'TRIP-1', vehicleId: 'TRK-021', tripNo: 1,
      date: new Date('2026-10-05T00:00:00.000Z'), plannedDeparture: '05:30', status: 'LOADING',
      totalWeightKg: 640, totalVolumeM3: 8.5,
      vehicle: { type: 'TRUCK', temp: 'REEFER', weightCapKg: 1000, volumeCapM3: 18 },
      loadingRecord: {
        id: 'LOAD-1', status: 'IN_PROGRESS', checkedById: 'USR-LDR',
        startedAt: new Date('2026-10-05T04:30:00.000Z'), completedAt: null,
        issues: [{
          id: 'ISSUE-1', orderLineId: 'LINE-1', type: 'MISSING', expectedQty: 20,
          availableQty: 16, note: 'Four unavailable', decision: null, status: 'OPEN',
          createdAt: new Date('2026-10-05T04:40:00.000Z'),
          updatedAt: new Date('2026-10-05T04:40:00.000Z'),
        }],
      },
      stops: [{
        id: 'STOP-1', sequence: 1, etaTime: '06:15',
        order: {
          id: 'ORD-1', outletId: 'OUT-001', temp: 'CHILLED', weightKg: 120, volumeM3: 2.5,
          outlet: {
            id: 'OUT-001', name: 'FreshMart Colombo 05', district: 'Colombo', brand: 'FRESH',
            dockType: 'REAR_DOCK', parkingConstraint: 'NORMAL',
            windowOpenTime: '04:00', windowCloseTime: '08:00', mallWindow: null,
          },
          lines: [{
            id: 'LINE-1', item: 'Milk cases', unit: 'cases', requestedQty: 20, loadedQty: 16,
          }],
        },
      }],
    });
    const detailService = new LoadingService({ trip: { findFirst } } as unknown as PrismaService);

    await expect(detailService.getLoadingTrip('TRIP-1', 'DEP-PLG')).resolves.toMatchObject({
      tripId: 'TRIP-1',
      loadingRecord: { id: 'LOAD-1', status: 'IN_PROGRESS' },
      stops: [{ order: { lines: [{ orderLineId: 'LINE-1', expectedQty: 20, loadedQty: 16 }] } }],
      issues: [{ issueId: 'ISSUE-1', status: 'OPEN', availableQty: 16 }],
    });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'TRIP-1',
        depotId: 'DEP-PLG',
        status: { in: ['CONFIRMED', 'LOADING', 'READY'] },
      },
    }));
  });

  it('does not reveal an unpublished or other-depot trip', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const detailService = new LoadingService({ trip: { findFirst } } as unknown as PrismaService);

    await expect(detailService.getLoadingTrip('TRIP-OTHER', 'DEP-PLG')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('starts a published trip and its planned orders in one transaction', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'TRIP-1',
      status: 'CONFIRMED',
      loadingRecord: null,
      stops: [{ orderId: 'ORD-1' }, { orderId: 'ORD-2' }],
    });
    const createRecord = jest.fn().mockResolvedValue({
      id: 'LOAD-1', status: 'IN_PROGRESS', checkedById: 'USR-LDR',
      startedAt: new Date('2026-10-05T04:30:00.000Z'),
    });
    const updateTrip = jest.fn().mockResolvedValue({});
    const updateOrders = jest.fn().mockResolvedValue({ count: 2 });
    const createAudit = jest.fn().mockResolvedValue({});
    const transaction = jest.fn(async (callback) => callback({
      loadingRecord: { create: createRecord },
      trip: { update: updateTrip },
      order: { updateMany: updateOrders },
      auditEvent: { create: createAudit },
    }));
    const startService = new LoadingService({
      trip: { findFirst },
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(startService.startLoading('TRIP-1', {
      id: 'USR-LDR', depotId: 'DEP-PLG',
    })).resolves.toMatchObject({
      loadingRecordId: 'LOAD-1', tripStatus: 'LOADING', loadingStatus: 'IN_PROGRESS',
      alreadyStarted: false,
    });

    expect(createRecord).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tripId: 'TRIP-1', checkedById: 'USR-LDR', status: 'IN_PROGRESS',
      }),
    });
    expect(updateTrip).toHaveBeenCalledWith({
      where: { id: 'TRIP-1' }, data: { status: 'LOADING' },
    });
    expect(updateOrders).toHaveBeenCalledWith({
      where: { id: { in: ['ORD-1', 'ORD-2'] }, status: 'PLANNED' },
      data: { status: 'LOADING' },
    });
    expect(createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'LOADING_STARTED', entityId: 'TRIP-1' }),
    });
  });

  it('returns an existing loading record without creating a duplicate', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'TRIP-1', status: 'LOADING', stops: [],
      loadingRecord: {
        id: 'LOAD-1', status: 'IN_PROGRESS', checkedById: 'USR-LDR',
        startedAt: new Date('2026-10-05T04:30:00.000Z'),
      },
    });
    const transaction = jest.fn();
    const startService = new LoadingService({
      trip: { findFirst }, $transaction: transaction,
    } as unknown as PrismaService);

    await expect(startService.startLoading('TRIP-1', {
      id: 'USR-LDR', depotId: 'DEP-PLG',
    })).resolves.toMatchObject({
      loadingRecordId: 'LOAD-1', alreadyStarted: true,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects starting a trip that is not in a loadable state', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'TRIP-1', status: 'READY', loadingRecord: null, stops: [],
    });
    const startService = new LoadingService({
      trip: { findFirst },
    } as unknown as PrismaService);

    await expect(startService.startLoading('TRIP-1', {
      id: 'USR-LDR', depotId: 'DEP-PLG',
    })).rejects.toMatchObject({ status: 409 });
  });
});
