import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // DRIVER TODAY
  // =========================================================
  async getDriverToday(userId: string) {
    const driver = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        vehicle: {
          include: {
            depot: true,
          },
        },
      },
    });

    if (!driver || driver.role !== 'DRIVER') {
      throw new NotFoundException('Driver not found');
    }

    if (!driver.vehicleId || !driver.vehicle) {
      return {
        driver: {
          id: driver.id,
          name: driver.name,
          email: driver.email,
        },
        vehicle: null,
        date: null,
        trips: [],
      };
    }

    const latestTrip = await this.prisma.trip.findFirst({
      where: {
        vehicleId: driver.vehicleId,
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        date: true,
      },
    });

    if (!latestTrip) {
      return {
        driver: {
          id: driver.id,
          name: driver.name,
          email: driver.email,
        },

        vehicle: {
          id: driver.vehicle.id,
          type: driver.vehicle.type,
          temp: driver.vehicle.temp,
          depot: driver.vehicle.depot.name,
        },

        date: null,
        trips: [],
      };
    }

    const trips = await this.prisma.trip.findMany({
      where: {
        vehicleId: driver.vehicleId,
        date: latestTrip.date,
      },

      orderBy: {
        tripNo: 'asc',
      },

      include: {
        stops: {
          orderBy: {
            sequence: 'asc',
          },

          include: {
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
        },

        loadingRecord: {
          include: {
            issues: true,
          },
        },
      },
    });

    return {
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
      },

      vehicle: {
        id: driver.vehicle.id,
        type: driver.vehicle.type,
        temp: driver.vehicle.temp,
        depot: driver.vehicle.depot.name,
      },

      date: latestTrip.date,

      trips: trips.map((trip) => ({
        id: trip.id,
        tripNo: trip.tripNo,
        status: trip.status,
        plannedDeparture: trip.plannedDeparture,
        totalWeightKg: trip.totalWeightKg,
        totalVolumeM3: trip.totalVolumeM3,
        distanceKm: trip.distanceKm,

        loaderIssues:
          trip.loadingRecord?.issues.length ?? 0,

        stops: trip.stops.map((stop) => ({
          id: stop.id,
          sequence: stop.sequence,
          etaTime: stop.etaTime,
          status: stop.status,
          arrivedAt: stop.arrivedAt,

          order: {
            id: stop.order.id,
            units: stop.order.units,
            weightKg: stop.order.weightKg,
            volumeM3: stop.order.volumeM3,
            temp: stop.order.temp,
            status: stop.order.status,

            items: stop.order.lines.map((line) => ({
              id: line.id,
              item: line.item,
              unit: line.unit,
              requestedQty: line.requestedQty,
              loadedQty: line.loadedQty,
              deliveredQty: line.deliveredQty,
            })),
          },

          outlet: {
            id: stop.order.outlet.id,
            name: stop.order.outlet.name,
            brand: stop.order.outlet.brand,
            district: stop.order.outlet.district,
            dockType: stop.order.outlet.dockType,
            parkingConstraint:
              stop.order.outlet.parkingConstraint,
            windowOpenTime:
              stop.order.outlet.windowOpenTime,
            windowCloseTime:
              stop.order.outlet.windowCloseTime,
            mallWindow: stop.order.outlet.mallWindow,
          },

          delivery: stop.delivery
            ? {
                id: stop.delivery.id,
                outcome: stop.delivery.outcome,
                reason: stop.delivery.reason,
                completedAt:
                  stop.delivery.completedAt,
                pod: stop.delivery.pod,
              }
            : null,
        })),
      })),
    };
  }

  // =========================================================
  // GET ONE TRIP
  // =========================================================
  async getTripById(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: {
        id: tripId,
      },

      include: {
        vehicle: true,
        depot: true,

        stops: {
          orderBy: {
            sequence: 'asc',
          },

          include: {
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
        },

        loadingRecord: {
          include: {
            issues: {
              include: {
                orderLine: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  // =========================================================
  // DISPATCHER DELIVERY PROGRESS
  // =========================================================
  async getDeliveryProgress(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: {
        id: tripId,
      },

      include: {
        vehicle: true,
        depot: true,

        stops: {
          orderBy: {
            sequence: 'asc',
          },

          include: {
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
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const deliveredCount = trip.stops.filter(
      (stop) => stop.status === 'DELIVERED',
    ).length;

    const partialCount = trip.stops.filter(
      (stop) => stop.status === 'PARTIAL',
    ).length;

    const failedCount = trip.stops.filter(
      (stop) => stop.status === 'FAILED',
    ).length;

    const pendingCount = trip.stops.filter(
      (stop) =>
        stop.status === 'PLANNED' ||
        stop.status === 'ARRIVED',
    ).length;

    return {
      trip: {
        id: trip.id,
        tripNo: trip.tripNo,
        status: trip.status,
        date: trip.date,
        plannedDeparture: trip.plannedDeparture,

        vehicle: {
          id: trip.vehicle.id,
          type: trip.vehicle.type,
          temp: trip.vehicle.temp,
        },

        depot: {
          id: trip.depot.id,
          name: trip.depot.name,
        },
      },

      progress: {
        totalStops: trip.stops.length,
        delivered: deliveredCount,
        partial: partialCount,
        failed: failedCount,
        pending: pendingCount,
        completed:
          deliveredCount +
          partialCount +
          failedCount,
      },

      stops: trip.stops.map((stop) => ({
        id: stop.id,
        sequence: stop.sequence,
        status: stop.status,
        etaTime: stop.etaTime,
        arrivedAt: stop.arrivedAt,

        outlet: {
          id: stop.order.outlet.id,
          name: stop.order.outlet.name,
          brand: stop.order.outlet.brand,
          district: stop.order.outlet.district,
        },

        order: {
          id: stop.order.id,

          items: stop.order.lines.map((line) => ({
            id: line.id,
            item: line.item,
            requestedQty: line.requestedQty,
            loadedQty: line.loadedQty,
            deliveredQty: line.deliveredQty,
          })),
        },

        delivery: stop.delivery
          ? {
              id: stop.delivery.id,
              outcome: stop.delivery.outcome,
              reason: stop.delivery.reason,
              arrivedAt: stop.delivery.arrivedAt,
              completedAt:
                stop.delivery.completedAt,
              podAvailable: Boolean(
                stop.delivery.pod,
              ),
            }
          : null,
      })),
    };
  }

  // =========================================================
  // STORE DELIVERY + POD
  // =========================================================
  async getOrderDelivery(orderId: string) {
    const stop =
      await this.prisma.tripStop.findFirst({
        where: {
          orderId,
        },

        include: {
          trip: {
            include: {
              vehicle: true,
            },
          },

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
        'Delivery information for this order was not found',
      );
    }

    return {
      order: {
        id: stop.order.id,
        status: stop.order.status,
        units: stop.order.units,
        weightKg: stop.order.weightKg,
        volumeM3: stop.order.volumeM3,

        outlet: {
          id: stop.order.outlet.id,
          name: stop.order.outlet.name,
          brand: stop.order.outlet.brand,
          district: stop.order.outlet.district,
        },

        items: stop.order.lines.map((line) => ({
          id: line.id,
          item: line.item,
          unit: line.unit,
          requestedQty: line.requestedQty,
          loadedQty: line.loadedQty,
          deliveredQty: line.deliveredQty,
        })),
      },

      trip: {
        id: stop.trip.id,
        tripNo: stop.trip.tripNo,
        status: stop.trip.status,

        vehicle: {
          id: stop.trip.vehicle.id,
          type: stop.trip.vehicle.type,
        },
      },

      stop: {
        id: stop.id,
        sequence: stop.sequence,
        status: stop.status,
        etaTime: stop.etaTime,
        arrivedAt: stop.arrivedAt,
      },

      delivery: stop.delivery
        ? {
            id: stop.delivery.id,
            outcome: stop.delivery.outcome,
            reason: stop.delivery.reason,
            arrivedAt: stop.delivery.arrivedAt,
            completedAt:
              stop.delivery.completedAt,

            pod: stop.delivery.pod
              ? {
                  recipientName:
                    stop.delivery.pod.recipientName,
                  signatureRef:
                    stop.delivery.pod.signatureRef,
                  photoRef:
                    stop.delivery.pod.photoRef,
                  capturedAt:
                    stop.delivery.pod.capturedAt,
                }
              : null,
          }
        : null,
    };
  }
}