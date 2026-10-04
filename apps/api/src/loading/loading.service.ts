import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AcknowledgeLoadingIssueResult,
  LoaderQueueStatus,
  CreateLoadingIssueBody,
  LoadedQuantityResult,
  LoadingIssueResult,
  LoadingStartResult,
  LoaderTripDetail,
  LoaderTripSummary,
  ReadyTripResult,
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
        evidenceRef: issue.evidenceRef,
        decision: issue.decision,
        status: issue.status,
        acknowledgedById: issue.acknowledgedById,
        acknowledgedAt: issue.acknowledgedAt?.toISOString() ?? null,
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

  async updateLoadedQuantity(
    lineId: string,
    loadedQty: number,
    loader: { id: string; depotId: string },
  ): Promise<LoadedQuantityResult> {
    if (!Number.isInteger(loadedQty) || loadedQty < 0) {
      throw new BadRequestException('loadedQty must be a non-negative whole number.');
    }

    const line = await this.prisma.orderLine.findUnique({
      where: { id: lineId },
      include: {
        order: {
          include: {
            stop: {
              include: {
                trip: {
                  include: { loadingRecord: true },
                },
              },
            },
          },
        },
      },
    });

    const trip = line?.order.stop?.trip;

    if (!line || !trip || trip.depotId !== loader.depotId) {
      throw new NotFoundException('Loading line not found for this Loader depot.');
    }

    if (trip.status !== 'LOADING' || trip.loadingRecord?.status !== 'IN_PROGRESS') {
      throw new ConflictException('Loaded quantities can only be changed while loading is in progress.');
    }

    if (loadedQty > line.requestedQty) {
      throw new BadRequestException(
        `loadedQty cannot exceed the expected quantity of ${line.requestedQty}.`,
      );
    }

    const previousLoadedQty = line.loadedQty ?? 0;

    return this.prisma.$transaction(async (transaction) => {
      const updatedLine = await transaction.orderLine.update({
        where: { id: lineId },
        data: { loadedQty },
      });

      await transaction.auditEvent.create({
        data: {
          actorId: loader.id,
          entityType: 'OrderLine',
          entityId: lineId,
          action: 'LOADED_QUANTITY_UPDATED',
          payload: {
            tripId: trip.id,
            expectedQty: line.requestedQty,
            previousLoadedQty,
            loadedQty,
          },
        },
      });

      return {
        orderLineId: updatedLine.id,
        tripId: trip.id,
        expectedQty: updatedLine.requestedQty,
        loadedQty: updatedLine.loadedQty ?? 0,
        complete: updatedLine.loadedQty === updatedLine.requestedQty,
      };
    });
  }

  async reportIssue(
    tripId: string,
    body: CreateLoadingIssueBody,
    loader: { id: string; depotId: string },
  ): Promise<LoadingIssueResult> {
    if (!body || !['MISSING', 'DAMAGED'].includes(body.type)) {
      throw new BadRequestException('type must be MISSING or DAMAGED.');
    }

    if (!body.orderLineId?.trim()) {
      throw new BadRequestException('orderLineId is required.');
    }

    if (!Number.isInteger(body.availableQty) || body.availableQty < 0) {
      throw new BadRequestException('availableQty must be a non-negative whole number.');
    }

    const line = await this.prisma.orderLine.findUnique({
      where: { id: body.orderLineId },
      include: {
        order: {
          include: {
            stop: {
              include: {
                trip: {
                  include: { loadingRecord: true },
                },
              },
            },
          },
        },
      },
    });
    const trip = line?.order.stop?.trip;

    if (!line || !trip || trip.id !== tripId || trip.depotId !== loader.depotId) {
      throw new NotFoundException('Order line not found in this loading trip.');
    }

    const loadingRecord = trip.loadingRecord;

    if (trip.status !== 'LOADING' || loadingRecord?.status !== 'IN_PROGRESS') {
      throw new ConflictException('Issues can only be reported while loading is in progress.');
    }

    const replacementLoaded =
      body.type === 'DAMAGED' &&
      body.replacementLoaded === true &&
      body.availableQty === line.requestedQty;

    if (body.availableQty >= line.requestedQty && !replacementLoaded) {
      throw new BadRequestException(
        `availableQty must be below ${line.requestedQty}, unless all damaged units were replaced.`,
      );
    }

    const existingIssue = await this.prisma.loadingIssue.findFirst({
      where: {
        loadingRecordId: loadingRecord.id,
        orderLineId: line.id,
        status: 'OPEN',
      },
      select: { id: true },
    });

    if (existingIssue) {
      throw new ConflictException('This order line already has an open loading issue.');
    }

    const note = body.note?.trim() || null;
    const evidenceRef = body.evidenceRef?.trim() || null;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.orderLine.update({
        where: { id: line.id },
        data: { loadedQty: body.availableQty },
      });

      const issue = await transaction.loadingIssue.create({
        data: {
          loadingRecordId: loadingRecord.id,
          orderLineId: line.id,
          type: body.type,
          expectedQty: line.requestedQty,
          availableQty: body.availableQty,
          note,
          evidenceRef,
          status: replacementLoaded ? 'REPLACEMENT_LOADED' : 'OPEN',
        },
      });

      await transaction.auditEvent.create({
        data: {
          actorId: loader.id,
          entityType: 'LoadingIssue',
          entityId: issue.id,
          action: 'LOADING_ISSUE_REPORTED',
          payload: {
            tripId,
            orderLineId: line.id,
            type: body.type,
            expectedQty: line.requestedQty,
            availableQty: body.availableQty,
            shortfallQty: line.requestedQty - body.availableQty,
            replacementLoaded,
            evidenceRef,
          },
        },
      });

      return {
        issueId: issue.id,
        tripId,
        loadingRecordId: issue.loadingRecordId,
        orderLineId: issue.orderLineId,
        type: issue.type,
        expectedQty: issue.expectedQty,
        availableQty: issue.availableQty,
        shortfallQty: issue.expectedQty - issue.availableQty,
        note: issue.note,
        evidenceRef: issue.evidenceRef,
        status: issue.status,
        decision: issue.decision,
        createdAt: issue.createdAt.toISOString(),
      };
    });
  }

  async acknowledgeIssue(
    issueId: string,
    loader: { id: string; depotId: string },
  ): Promise<AcknowledgeLoadingIssueResult> {
    const issue = await this.prisma.loadingIssue.findUnique({
      where: { id: issueId },
      include: {
        loadingRecord: {
          include: { trip: true },
        },
      },
    });

    if (!issue || issue.loadingRecord.trip.depotId !== loader.depotId) {
      throw new NotFoundException('Loading issue not found for this Loader depot.');
    }

    if (issue.status === 'OPEN' || !issue.decision?.trim()) {
      throw new ConflictException('The Dispatcher must decide this issue before it can be acknowledged.');
    }

    if (issue.acknowledgedAt) {
      return {
        issueId: issue.id,
        tripId: issue.loadingRecord.tripId,
        status: issue.status,
        decision: issue.decision,
        acknowledgedById: issue.acknowledgedById,
        acknowledgedAt: issue.acknowledgedAt.toISOString(),
        alreadyAcknowledged: true,
      };
    }

    const acknowledgedAt = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const acknowledged = await transaction.loadingIssue.update({
        where: { id: issueId },
        data: {
          acknowledgedById: loader.id,
          acknowledgedAt,
        },
      });

      await transaction.auditEvent.create({
        data: {
          actorId: loader.id,
          entityType: 'LoadingIssue',
          entityId: issueId,
          action: 'DISPATCHER_DECISION_ACKNOWLEDGED',
          payload: {
            tripId: issue.loadingRecord.tripId,
            status: issue.status,
            decision: issue.decision,
          },
        },
      });

      return {
        issueId: acknowledged.id,
        tripId: issue.loadingRecord.tripId,
        status: acknowledged.status,
        decision: acknowledged.decision,
        acknowledgedById: acknowledged.acknowledgedById,
        acknowledgedAt: acknowledged.acknowledgedAt!.toISOString(),
        alreadyAcknowledged: false,
      };
    });
  }

  async markTripReady(
    tripId: string,
    loader: { id: string; depotId: string },
  ): Promise<ReadyTripResult> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, depotId: loader.depotId },
      include: {
        loadingRecord: {
          include: { issues: true },
        },
        stops: {
          include: {
            order: {
              include: { lines: true },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found for this Loader depot.');
    }

    const loadingRecord = trip.loadingRecord;

    if (
      trip.status === 'READY' &&
      loadingRecord?.status === 'COMPLETED' &&
      loadingRecord.completedAt
    ) {
      return readyResult(trip, true);
    }

    if (trip.status !== 'LOADING' || loadingRecord?.status !== 'IN_PROGRESS') {
      throw new ConflictException({
        code: 'LOADING_NOT_READY',
        message: 'The trip must have an active loading record before it can be marked ready.',
        blockers: [{ type: 'INVALID_LOADING_STATE' }],
      });
    }

    const blockers: Array<Record<string, unknown>> = [];

    for (const issue of loadingRecord.issues) {
      if (issue.status === 'OPEN') {
        blockers.push({
          type: 'OPEN_ISSUE',
          issueId: issue.id,
          orderLineId: issue.orderLineId,
        });
      } else if (issue.status !== 'REPLACEMENT_LOADED' && !issue.acknowledgedAt) {
        blockers.push({
          type: 'DECISION_NOT_ACKNOWLEDGED',
          issueId: issue.id,
          orderLineId: issue.orderLineId,
        });
      }
    }

    for (const stop of trip.stops) {
      for (const line of stop.order.lines) {
        if (line.loadedQty === null) {
          blockers.push({
            type: 'QUANTITY_NOT_VERIFIED',
            orderLineId: line.id,
            expectedQty: line.requestedQty,
          });
          continue;
        }

        if (line.loadedQty > line.requestedQty) {
          blockers.push({
            type: 'QUANTITY_EXCEEDS_EXPECTED',
            orderLineId: line.id,
            expectedQty: line.requestedQty,
            loadedQty: line.loadedQty,
          });
          continue;
        }

        if (line.loadedQty < line.requestedQty) {
          const approvedIssue = loadingRecord.issues.find(
            (issue) =>
              issue.orderLineId === line.id &&
              issue.status !== 'OPEN' &&
              Boolean(issue.acknowledgedAt),
          );

          if (!approvedIssue) {
            blockers.push({
              type: 'SHORTFALL_NOT_APPROVED',
              orderLineId: line.id,
              expectedQty: line.requestedQty,
              loadedQty: line.loadedQty,
            });
          }
        }
      }
    }

    if (blockers.length > 0) {
      throw new ConflictException({
        code: 'LOADING_NOT_READY',
        message: 'Resolve all loading checks before marking this trip ready.',
        blockers,
      });
    }

    const completedAt = new Date();
    const orderIds = trip.stops.map((stop) => stop.orderId);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.loadingRecord.update({
        where: { id: loadingRecord.id },
        data: { status: 'COMPLETED', completedAt },
      });

      await transaction.trip.update({
        where: { id: tripId },
        data: { status: 'READY' },
      });

      if (orderIds.length > 0) {
        await transaction.order.updateMany({
          where: { id: { in: orderIds }, status: 'LOADING' },
          data: { status: 'READY' },
        });
      }

      await transaction.auditEvent.create({
        data: {
          actorId: loader.id,
          entityType: 'Trip',
          entityId: tripId,
          action: 'TRIP_MARKED_READY',
          payload: {
            loadingRecordId: loadingRecord.id,
            shortfallIssueIds: loadingRecord.issues
              .filter((issue) => issue.status === 'SHIP_SHORT')
              .map((issue) => issue.id),
          },
        },
      });
    });

    loadingRecord.status = 'COMPLETED';
    loadingRecord.completedAt = completedAt;
    trip.status = 'READY';

    return readyResult(trip, false);
  }
}

function readyResult(
  trip: {
    id: string;
    status: string;
    loadingRecord: {
      id: string;
      status: string;
      completedAt: Date | null;
      issues: Array<{
        id: string;
        orderLineId: string;
        status: string;
        expectedQty: number;
        availableQty: number;
      }>;
    } | null;
  },
  alreadyReady: boolean,
): ReadyTripResult {
  const loadingRecord = trip.loadingRecord!;

  return {
    tripId: trip.id,
    tripStatus: 'READY',
    loadingRecordId: loadingRecord.id,
    loadingStatus: 'COMPLETED',
    completedAt: loadingRecord.completedAt!.toISOString(),
    alreadyReady,
    shortfalls: loadingRecord.issues
      .filter((issue) => issue.status === 'SHIP_SHORT')
      .map((issue) => ({
        issueId: issue.id,
        orderLineId: issue.orderLineId,
        expectedQty: issue.expectedQty,
        loadedQty: issue.availableQty,
        shortfallQty: issue.expectedQty - issue.availableQty,
      })),
  };
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
