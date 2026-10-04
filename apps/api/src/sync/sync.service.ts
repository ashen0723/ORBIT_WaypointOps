import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SyncActionInput = {
  clientActionId: string;
  userId: string;
  actionType: 'ARRIVE' | 'DELIVERY_OUTCOME';
  entityId: string;
  payload?: Record<string, unknown>;
};

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async processActions(actions: SyncActionInput[]) {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestException('Actions are required');
    }

    const results = [];

    for (const action of actions) {
      const result = await this.processSingleAction(action);
      results.push(result);
    }

    return {
      success: true,
      results,
    };
  }

  private async processSingleAction(action: SyncActionInput) {
    if (
      !action.clientActionId ||
      !action.userId ||
      !action.actionType ||
      !action.entityId
    ) {
      return {
        clientActionId: action.clientActionId ?? null,
        status: 'FAILED',
        error: 'Missing required action fields',
      };
    }

    // Check whether this exact offline action was already processed.
    const existing = await this.prisma.syncAction.findUnique({
      where: {
        clientActionId: action.clientActionId,
      },
    });

    if (existing) {
      return {
        clientActionId: existing.clientActionId,
        status: existing.status,
        duplicate: true,
        syncedAt: existing.syncedAt,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: action.userId,
      },
    });

    if (!user || user.role !== 'DRIVER') {
      return {
        clientActionId: action.clientActionId,
        status: 'FAILED',
        error: 'Driver not found or not authorized',
      };
    }

    const stop = await this.prisma.tripStop.findUnique({
      where: {
        id: action.entityId,
      },
      include: {
        trip: true,
        delivery: true,
      },
    });

    if (!stop) {
      return {
        clientActionId: action.clientActionId,
        status: 'FAILED',
        error: 'Trip stop not found',
      };
    }

    // Make sure the stop belongs to the vehicle assigned to this driver.
    if (!user.vehicleId || stop.trip.vehicleId !== user.vehicleId) {
      return {
        clientActionId: action.clientActionId,
        status: 'CONFLICT',
        conflictCode: 'STOP_NOT_ASSIGNED',
        message: 'This stop is no longer assigned to this driver',
        currentState: {
          stopId: stop.id,
          status: stop.status,
          tripId: stop.tripId,
          vehicleId: stop.trip.vehicleId,
        },
      };
    }

    try {
      switch (action.actionType) {
        case 'ARRIVE':
          return await this.processArrival(action, stop);

        case 'DELIVERY_OUTCOME':
          return await this.processOutcome(action, stop);

        default:
          return {
            clientActionId: action.clientActionId,
            status: 'FAILED',
            error: 'Unsupported action type',
          };
      }
    } catch (error) {
      return {
        clientActionId: action.clientActionId,
        status: 'FAILED',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown synchronization error',
      };
    }
  }

  private async processArrival(
    action: SyncActionInput,
    stop: {
      id: string;
      status: string;
      arrivedAt: Date | null;
    },
  ) {
    // A completed stop cannot go backwards to ARRIVED.
    if (
      stop.status === 'DELIVERED' ||
      stop.status === 'PARTIAL' ||
      stop.status === 'FAILED' ||
      stop.status === 'RESCHEDULED'
    ) {
      return {
        clientActionId: action.clientActionId,
        status: 'CONFLICT',
        conflictCode: 'STALE_STOP_STATE',
        message: 'Stop has already moved past arrival',
        currentState: {
          stopId: stop.id,
          status: stop.status,
          arrivedAt: stop.arrivedAt,
        },
      };
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.tripStop.update({
        where: {
          id: stop.id,
        },
        data: {
          status: 'ARRIVED',
          arrivedAt: stop.arrivedAt ?? now,
        },
      });

      await tx.syncAction.create({
        data: {
          clientActionId: action.clientActionId,
          userId: action.userId,
          actionType: action.actionType,
          entityId: action.entityId,
          payload: (action.payload ?? {}) as object,
          status: 'SYNCED',
          retryCount: 0,
          syncedAt: now,
        },
      });
    });

    return {
      clientActionId: action.clientActionId,
      status: 'SYNCED',
      stopId: stop.id,
      stopStatus: 'ARRIVED',
      syncedAt: now,
    };
  }

  private async processOutcome(
    action: SyncActionInput,
    stop: {
      id: string;
      status: string;
      arrivedAt: Date | null;
    },
  ) {
    const payload = action.payload ?? {};

    const outcome = payload.outcome;

    if (
      outcome !== 'DELIVERED' &&
      outcome !== 'PARTIAL' &&
      outcome !== 'FAILED'
    ) {
      return {
        clientActionId: action.clientActionId,
        status: 'FAILED',
        error: 'Invalid delivery outcome',
      };
    }

    const reason =
      typeof payload.reason === 'string'
        ? payload.reason
        : undefined;

    if (
      (outcome === 'PARTIAL' || outcome === 'FAILED') &&
      !reason
    ) {
      return {
        clientActionId: action.clientActionId,
        status: 'FAILED',
        error: 'Reason is required for partial or failed delivery',
      };
    }

    // Already resolved by another action while this action was offline.
    if (
      stop.status === 'DELIVERED' ||
      stop.status === 'PARTIAL' ||
      stop.status === 'FAILED' ||
      stop.status === 'RESCHEDULED'
    ) {
      return {
        clientActionId: action.clientActionId,
        status: 'CONFLICT',
        conflictCode: 'STALE_STOP_STATE',
        message: 'Stop was already resolved before this action synchronized',
        currentState: {
          stopId: stop.id,
          status: stop.status,
        },
      };
    }

    const recipientName =
      typeof payload.recipientName === 'string'
        ? payload.recipientName
        : undefined;

    const signatureRef =
      typeof payload.signatureRef === 'string'
        ? payload.signatureRef
        : undefined;

    const photoRef =
      typeof payload.photoRef === 'string'
        ? payload.photoRef
        : undefined;

    const now = new Date();

    const delivery = await this.prisma.$transaction(async (tx) => {
      const savedDelivery = await tx.delivery.upsert({
        where: {
          stopId: stop.id,
        },
        update: {
          outcome,
          reason: reason ?? null,
          arrivedAt: stop.arrivedAt ?? now,
          completedAt: now,
          clientActionId: action.clientActionId,
        },
        create: {
          stopId: stop.id,
          outcome,
          reason: reason ?? null,
          arrivedAt: stop.arrivedAt ?? now,
          completedAt: now,
          clientActionId: action.clientActionId,
        },
      });

      await tx.tripStop.update({
        where: {
          id: stop.id,
        },
        data: {
          status: outcome,
          arrivedAt: stop.arrivedAt ?? now,
        },
      });

      if (recipientName || signatureRef || photoRef) {
        await tx.proofOfDelivery.upsert({
          where: {
            deliveryId: savedDelivery.id,
          },
          update: {
            recipientName: recipientName ?? null,
            signatureRef: signatureRef ?? null,
            photoRef: photoRef ?? null,
            capturedAt: now,
          },
          create: {
            deliveryId: savedDelivery.id,
            recipientName: recipientName ?? null,
            signatureRef: signatureRef ?? null,
            photoRef: photoRef ?? null,
            capturedAt: now,
          },
        });
      }

      await tx.syncAction.create({
        data: {
          clientActionId: action.clientActionId,
          userId: action.userId,
          actionType: action.actionType,
          entityId: action.entityId,
          payload: payload as object,
          status: 'SYNCED',
          retryCount: 0,
          syncedAt: now,
        },
      });

      return savedDelivery;
    });

    return {
      clientActionId: action.clientActionId,
      status: 'SYNCED',
      deliveryId: delivery.id,
      stopId: stop.id,
      stopStatus: outcome,
      syncedAt: now,
    };
  }

  async getAction(clientActionId: string) {
    const action = await this.prisma.syncAction.findUnique({
      where: {
        clientActionId,
      },
    });

    if (!action) {
      throw new NotFoundException('Sync action not found');
    }

    return action;
  }
}