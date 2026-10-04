import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type DeliveredItemInput = {
  lineId: string;
  deliveredQty: number;
};

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // 1. DRIVER ARRIVES AT STOP
  // =========================================================
  async markArrived(stopId: string) {
    const stop = await this.prisma.tripStop.findUnique({
      where: {
        id: stopId,
      },
      include: {
        trip: true,
      },
    });

    if (!stop) {
      throw new NotFoundException('Trip stop not found');
    }

    if (
      stop.status === 'DELIVERED' ||
      stop.status === 'PARTIAL' ||
      stop.status === 'FAILED' ||
      stop.status === 'RESCHEDULED'
    ) {
      throw new BadRequestException(
        'This stop has already been resolved',
      );
    }

    const now = new Date();

    const updatedStop = await this.prisma.tripStop.update({
      where: {
        id: stopId,
      },
      data: {
        status: 'ARRIVED',
        arrivedAt: stop.arrivedAt ?? now,
      },
    });

    // When first stop starts, trip becomes IN_TRANSIT
    if (stop.trip.status === 'READY') {
      await this.prisma.trip.update({
        where: {
          id: stop.tripId,
        },
        data: {
          status: 'IN_TRANSIT',
        },
      });
    }

    return updatedStop;
  }

  // =========================================================
  // 2. RECORD DELIVERY OUTCOME
  // =========================================================
  async recordDelivery(
    stopId: string,
    body: {
      outcome: 'DELIVERED' | 'PARTIAL' | 'FAILED';
      reason?: string;

      recipientName?: string;
      signatureRef?: string;
      photoRef?: string;

      clientActionId?: string;

      items?: DeliveredItemInput[];
    },
  ) {
    const stop = await this.prisma.tripStop.findUnique({
      where: {
        id: stopId,
      },
      include: {
        trip: true,

        order: {
          include: {
            lines: true,
          },
        },

        delivery: {
          include: {
            pod: true,
          },
        },
      },
    });

    if (!stop) {
      throw new NotFoundException('Trip stop not found');
    }

    if (
      body.outcome !== 'DELIVERED' &&
      body.outcome !== 'PARTIAL' &&
      body.outcome !== 'FAILED'
    ) {
      throw new BadRequestException(
        'Invalid delivery outcome',
      );
    }

    if (
      (body.outcome === 'PARTIAL' ||
        body.outcome === 'FAILED') &&
      !body.reason
    ) {
      throw new BadRequestException(
        'Reason is required for partial or failed delivery',
      );
    }

    // Prevent duplicate offline action
    if (body.clientActionId) {
      const existingDelivery =
        await this.prisma.delivery.findUnique({
          where: {
            clientActionId: body.clientActionId,
          },
          include: {
            pod: true,
          },
        });

      if (existingDelivery) {
        return existingDelivery;
      }
    }

    // =====================================================
    // Validate delivered item quantities
    // =====================================================

    if (body.items) {
      for (const item of body.items) {
        const orderLine = stop.order.lines.find(
          (line) => line.id === item.lineId,
        );

        if (!orderLine) {
          throw new BadRequestException(
            `Order line ${item.lineId} does not belong to this stop`,
          );
        }

        if (
          !Number.isFinite(item.deliveredQty) ||
          item.deliveredQty < 0
        ) {
          throw new BadRequestException(
            `Invalid delivered quantity for line ${item.lineId}`,
          );
        }

        const maximumAllowed =
          orderLine.loadedQty ?? orderLine.requestedQty;

        if (item.deliveredQty > maximumAllowed) {
          throw new BadRequestException(
            `Delivered quantity cannot exceed loaded quantity for line ${item.lineId}`,
          );
        }
      }
    }

    // Partial deliveries must include actual quantities
    if (
      body.outcome === 'PARTIAL' &&
      (!body.items || body.items.length === 0)
    ) {
      throw new BadRequestException(
        'Delivered quantities are required for a partial delivery',
      );
    }

    const now = new Date();

    const delivery =
      await this.prisma.$transaction(async (tx) => {
        // -----------------------------------------------
        // Update actual delivered quantities
        // -----------------------------------------------

        if (body.items) {
          for (const item of body.items) {
            await tx.orderLine.update({
              where: {
                id: item.lineId,
              },
              data: {
                deliveredQty: item.deliveredQty,
              },
            });
          }
        }

        // Full delivery:
        // If item quantities were not explicitly supplied,
        // use the actual loaded quantity.
        if (
          body.outcome === 'DELIVERED' &&
          (!body.items || body.items.length === 0)
        ) {
          for (const line of stop.order.lines) {
            await tx.orderLine.update({
              where: {
                id: line.id,
              },
              data: {
                deliveredQty:
                  line.loadedQty ?? line.requestedQty,
              },
            });
          }
        }

        // Failed delivery = no delivered quantity
        if (body.outcome === 'FAILED') {
          for (const line of stop.order.lines) {
            await tx.orderLine.update({
              where: {
                id: line.id,
              },
              data: {
                deliveredQty: 0,
              },
            });
          }
        }

        // -----------------------------------------------
        // Save delivery
        // -----------------------------------------------

        const savedDelivery =
          await tx.delivery.upsert({
            where: {
              stopId,
            },

            update: {
              outcome: body.outcome,
              reason: body.reason ?? null,
              arrivedAt: stop.arrivedAt ?? now,
              completedAt: now,
              clientActionId:
                body.clientActionId ??
                stop.delivery?.clientActionId ??
                null,
            },

            create: {
              stopId,
              outcome: body.outcome,
              reason: body.reason ?? null,
              arrivedAt: stop.arrivedAt ?? now,
              completedAt: now,
              clientActionId:
                body.clientActionId ?? null,
            },
          });

        // -----------------------------------------------
        // Update stop status
        // -----------------------------------------------

        await tx.tripStop.update({
          where: {
            id: stopId,
          },
          data: {
            status: body.outcome,
            arrivedAt: stop.arrivedAt ?? now,
          },
        });

        // -----------------------------------------------
        // Proof Of Delivery
        // -----------------------------------------------

        if (
          body.recipientName ||
          body.signatureRef ||
          body.photoRef
        ) {
          await tx.proofOfDelivery.upsert({
            where: {
              deliveryId: savedDelivery.id,
            },

            update: {
              recipientName:
                body.recipientName ?? null,
              signatureRef:
                body.signatureRef ?? null,
              photoRef: body.photoRef ?? null,
              capturedAt: now,
            },

            create: {
              deliveryId: savedDelivery.id,
              recipientName:
                body.recipientName ?? null,
              signatureRef:
                body.signatureRef ?? null,
              photoRef: body.photoRef ?? null,
              capturedAt: now,
            },
          });
        }

        return savedDelivery;
      });

    // Check whether trip is now complete
    await this.updateTripCompletion(stop.tripId);

    return this.prisma.delivery.findUnique({
      where: {
        id: delivery.id,
      },
      include: {
        pod: true,

        stop: {
          include: {
            order: {
              include: {
                outlet: true,
                lines: true,
              },
            },
          },
        },
      },
    });
  }

  // =========================================================
  // 3. GET DELIVERY / STOP DETAILS
  // =========================================================
  async getDeliveryByStop(stopId: string) {
    const stop = await this.prisma.tripStop.findUnique({
      where: {
        id: stopId,
      },

      include: {
        trip: true,

        order: {
          include: {
            outlet: true,
            lines: true,
          },
        },

        delivery: {
          include: {
            pod: true,
          },
        },
      },
    });

    if (!stop) {
      throw new NotFoundException(
        'Trip stop not found',
      );
    }

    return stop;
  }

  // =========================================================
  // 4. DRIVER REPORTS OPERATIONAL ISSUE
  // =========================================================
  async reportIssue(
    userId: string,
    body: {
      stopId?: string;
      tripId?: string;

      issueType:
        | 'BREAKDOWN'
        | 'DELAY'
        | 'ROAD'
        | 'OUTLET'
        | 'OTHER';

      message: string;
    },
  ) {
    if (!body.issueType || !body.message) {
      throw new BadRequestException(
        'Issue type and message are required',
      );
    }

    const driver = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!driver || driver.role !== 'DRIVER') {
      throw new NotFoundException(
        'Driver not found',
      );
    }

    if (!body.stopId && !body.tripId) {
      throw new BadRequestException(
        'stopId or tripId is required',
      );
    }

    let entityType = 'Trip';
    let entityId = body.tripId;

    if (body.stopId) {
      const stop =
        await this.prisma.tripStop.findUnique({
          where: {
            id: body.stopId,
          },
          include: {
            trip: true,
          },
        });

      if (!stop) {
        throw new NotFoundException(
          'Trip stop not found',
        );
      }

      if (
        !driver.vehicleId ||
        stop.trip.vehicleId !== driver.vehicleId
      ) {
        throw new BadRequestException(
          'This stop is not assigned to this driver',
        );
      }

      entityType = 'TripStop';
      entityId = stop.id;
    } else if (body.tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: {
          id: body.tripId,
        },
      });

      if (!trip) {
        throw new NotFoundException(
          'Trip not found',
        );
      }

      if (
        !driver.vehicleId ||
        trip.vehicleId !== driver.vehicleId
      ) {
        throw new BadRequestException(
          'This trip is not assigned to this driver',
        );
      }
    }

    if (!entityId) {
      throw new BadRequestException(
        'Unable to identify issue entity',
      );
    }

    return this.prisma.auditEvent.create({
      data: {
        entityType,
        entityId,
        action: 'DRIVER_ISSUE_REPORTED',
        actorId: userId,
        reason: `${body.issueType}: ${body.message}`,
      },
    });
  }

  // =========================================================
  // 5. COMPLETE TRIP
  // =========================================================
  async completeTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        stops: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.stops.length === 0) {
      throw new BadRequestException(
        'Trip has no stops',
      );
    }

    const unresolvedStops = trip.stops.filter(
      (stop) =>
        stop.status !== 'DELIVERED' &&
        stop.status !== 'PARTIAL' &&
        stop.status !== 'FAILED' &&
        stop.status !== 'RESCHEDULED',
    );

    if (unresolvedStops.length > 0) {
      throw new BadRequestException(
        'All trip stops must be resolved before completing the trip',
      );
    }

    const hasExceptions = trip.stops.some(
      (stop) =>
        stop.status === 'PARTIAL' ||
        stop.status === 'FAILED' ||
        stop.status === 'RESCHEDULED',
    );

    return this.prisma.trip.update({
      where: {
        id: tripId,
      },
      data: {
        status: hasExceptions
          ? 'COMPLETED_WITH_EXCEPTIONS'
          : 'COMPLETED',
      },
      include: {
        stops: true,
      },
    });
  }

  // =========================================================
  // INTERNAL: AUTO UPDATE TRIP COMPLETION
  // =========================================================
  private async updateTripCompletion(
    tripId: string,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        stops: true,
      },
    });

    if (!trip || trip.stops.length === 0) {
      return;
    }

    const allResolved = trip.stops.every(
      (stop) =>
        stop.status === 'DELIVERED' ||
        stop.status === 'PARTIAL' ||
        stop.status === 'FAILED' ||
        stop.status === 'RESCHEDULED',
    );

    if (!allResolved) {
      return;
    }

    const hasExceptions = trip.stops.some(
      (stop) =>
        stop.status === 'PARTIAL' ||
        stop.status === 'FAILED' ||
        stop.status === 'RESCHEDULED',
    );

    await this.prisma.trip.update({
      where: {
        id: tripId,
      },
      data: {
        status: hasExceptions
          ? 'COMPLETED_WITH_EXCEPTIONS'
          : 'COMPLETED',
      },
    });
  }
}