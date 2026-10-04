import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LoaderQueueStatus, LoaderTripSummary } from './loading.types';

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
