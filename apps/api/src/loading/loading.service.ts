import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  LoaderQueueStatus,
  LoadingStartResult,
  LoaderTripDetail,
  LoaderTripSummary,
} from './loading.types';

/** Loading records, actual quantities, shortfalls, ready state. */
@Injectable()
export class LoadingService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublishedTrips(depotId: string): Promise<LoaderTripSummary[]> {
    const trips = await this.prisma.trip.findMany({
      where: {
        depotId,
        status: { in: ['CONFIRMED', 'LOADING', 'READY'] },
      },
      orderBy: [{ date: 'asc' }, { plannedDeparture: 'asc' }, { tripNo: 'asc' }],
      include: {
        vehicle: true,
        loadingRecord: {
          include: { issues: true },
        },
        stops: {
          orderBy: { sequence: 'asc' },
          include: {
            order: {
              include: { outlet: true },
            },
          },
        },
      },
    });

    return trips.map((trip) => {
      const districts = [...new Set(trip.stops.map((stop) => stop.order.outlet.district))];
      const brands = [...new Set(trip.stops.map((stop) => stop.order.outlet.brand))];
      const openIssueCount = trip.loadingRecord?.issues.filter((issue) => issue.status === 'OPEN').length ?? 0;

      return {
        tripId: trip.id,
        vehicleId: trip.vehicleId,
        tripNo: trip.tripNo,
        date: trip.date.toISOString().slice(0, 10),
        plannedDeparture: trip.plannedDeparture,
        status: queueStatus(trip.status, trip.loadingRecord?.status, openIssueCount),
        tripStatus: trip.status,
        loadingRecordStatus: trip.loadingRecord?.status ?? 'NOT_STARTED',
        stopCount: trip.stops.length,
        orderCount: trip.stops.length,
        openIssueCount,
        districts,
        brands,
        plannedWeightKg: trip.totalWeightKg,
        plannedVolumeM3: trip.totalVolumeM3,
        vehicle: {
          type: trip.vehicle.type,
          temperature: trip.vehicle.temp,
          weightCapacityKg: trip.vehicle.weightCapKg,
          volumeCapacityM3: trip.vehicle.volumeCapM3,
        },
        stops: trip.stops.map((stop) => ({
          tripStopId: stop.id,
          sequence: stop.sequence,
          orderId: stop.orderId,
          outletId: stop.order.outletId,
          outletName: stop.order.outlet.name,
          district: stop.order.outlet.district,
          brand: stop.order.outlet.brand,
          etaTime: stop.etaTime,
        })),
      };
    });
  }

  async getLoadingTrip(tripId: string, depotId: string): Promise<LoaderTripDetail> {
    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        depotId,
        status: { in: ['CONFIRMED', 'LOADING', 'READY'] },
      },
      include: {
        vehicle: true,
        loadingRecord: {
          include: {
            issues: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        stops: {
          orderBy: { sequence: 'asc' },
          include: {
            order: {
              include: {
                outlet: true,
                lines: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Published loading trip not found for this depot.');
    }

    return {
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      tripNo: trip.tripNo,
      date: trip.date.toISOString().slice(0, 10),
      plannedDeparture: trip.plannedDeparture,
      tripStatus: trip.status,
      plannedWeightKg: trip.totalWeightKg,
      plannedVolumeM3: trip.totalVolumeM3,
      vehicle: {
        type: trip.vehicle.type,
        temperature: trip.vehicle.temp,
        weightCapacityKg: trip.vehicle.weightCapKg,
        volumeCapacityM3: trip.vehicle.volumeCapM3,
      },
      loadingRecord: trip.loadingRecord
        ? {
            id: trip.loadingRecord.id,
            status: trip.loadingRecord.status,
            checkedById: trip.loadingRecord.checkedById,
            startedAt: trip.loadingRecord.startedAt?.toISOString() ?? null,
            completedAt: trip.loadingRecord.completedAt?.toISOString() ?? null,
          }
        : null,
      stops: trip.stops.map((stop) => ({
        tripStopId: stop.id,
        sequence: stop.sequence,
        etaTime: stop.etaTime,
        order: {
          orderId: stop.order.id,
          temperature: stop.order.temp,
          weightKg: stop.order.weightKg,
          volumeM3: stop.order.volumeM3,
          outlet: {
            outletId: stop.order.outlet.id,
            name: stop.order.outlet.name,
            district: stop.order.outlet.district,
            brand: stop.order.outlet.brand,
            dockType: stop.order.outlet.dockType,
            parkingConstraint: stop.order.outlet.parkingConstraint,
            deliveryWindow: {
              opensAt: stop.order.outlet.windowOpenTime,
              closesAt: stop.order.outlet.windowCloseTime,
              mallWindow: stop.order.outlet.mallWindow,
            },
          },
          lines: stop.order.lines.map((line) => ({
            orderLineId: line.id,
            item: line.item,
            unit: line.unit,
            expectedQty: line.requestedQty,
            loadedQty: line.loadedQty ?? 0,
          })),
        },
      })),
      issues: (trip.loadingRecord?.issues ?? []).map((issue) => ({
        issueId: issue.id,
        orderLineId: issue.orderLineId,
        type: issue.type,
        expectedQty: issue.expectedQty,
        availableQty: issue.availableQty,
        note: issue.note,
        decision: issue.decision,
        status: issue.status,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
      })),
    };
  }

  async startLoading(
    tripId: string,
    loader: { id: string; depotId: string },
  ): Promise<LoadingStartResult> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, depotId: loader.depotId },
      select: {
        id: true,
        status: true,
        loadingRecord: {
          select: {
            id: true,
            status: true,
            checkedById: true,
            startedAt: true,
          },
        },
        stops: {
          select: { orderId: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found for this Loader depot.');
    }

    if (!['CONFIRMED', 'LOADING'].includes(trip.status)) {
      throw new ConflictException('Only a published trip awaiting or currently in loading can be started.');
    }

    if (trip.loadingRecord) {
      return {
        loadingRecordId: trip.loadingRecord.id,
        tripId,
        tripStatus: trip.status,
        loadingStatus: trip.loadingRecord.status,
        checkedById: trip.loadingRecord.checkedById,
        startedAt: trip.loadingRecord.startedAt?.toISOString() ?? null,
        alreadyStarted: true,
      };
    }

    const startedAt = new Date();
    const orderIds = trip.stops.map((stop) => stop.orderId);

    return this.prisma.$transaction(async (transaction) => {
      const loadingRecord = await transaction.loadingRecord.create({
        data: {
          tripId,
          checkedById: loader.id,
          status: 'IN_PROGRESS',
          startedAt,
        },
      });

      await transaction.trip.update({
        where: { id: tripId },
        data: { status: 'LOADING' },
      });

      if (orderIds.length > 0) {
        await transaction.order.updateMany({
          where: {
            id: { in: orderIds },
            status: 'PLANNED',
          },
          data: { status: 'LOADING' },
        });
      }

      await transaction.auditEvent.create({
        data: {
          actorId: loader.id,
          entityType: 'Trip',
          entityId: tripId,
          action: 'LOADING_STARTED',
          payload: { loadingRecordId: loadingRecord.id },
        },
      });

      return {
        loadingRecordId: loadingRecord.id,
        tripId,
        tripStatus: 'LOADING',
        loadingStatus: loadingRecord.status,
        checkedById: loadingRecord.checkedById,
        startedAt: loadingRecord.startedAt?.toISOString() ?? null,
        alreadyStarted: false,
      };
    });
  }
}

function queueStatus(
  tripStatus: string,
  loadingRecordStatus: string | undefined,
  openIssueCount: number,
): LoaderQueueStatus {
  if (loadingRecordStatus === 'COMPLETED' || tripStatus === 'READY') {
    return 'READY_TO_DEPART';
  }

  if (openIssueCount > 0) {
    return 'AWAITING_DISPATCHER';
  }

  if (loadingRecordStatus === 'IN_PROGRESS' || tripStatus === 'LOADING') {
    return 'LOADING';
  }

  return 'READY_TO_LOAD';
}
