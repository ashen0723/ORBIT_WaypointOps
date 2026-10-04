import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

import type { Actor } from "../auth/auth.service";
import { fail } from "../common/api-error";
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getDriverProfile(actor: Actor, userId: string) {
    if (actor.role !== "DRIVER" || actor.id !== userId)
      fail(403, "FORBIDDEN", "Drivers can read only their own profile.");
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
        depot: true,
      },
    });

    if (!driver || !driver.active || driver.role !== "DRIVER") {
      throw new NotFoundException("Driver not found");
    }

    return {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      role: driver.role,
      active: driver.active,

      vehicle: driver.vehicle
        ? {
            id: driver.vehicle.id,
            type: driver.vehicle.type,
            temp: driver.vehicle.temp,
            weightCapKg: driver.vehicle.weightCapKg,
            volumeCapM3: driver.vehicle.volumeCapM3,
            fuelType: driver.vehicle.fuelType,
            depot: {
              id: driver.vehicle.depot.id,
              name: driver.vehicle.depot.name,
            },
          }
        : null,

      depot: driver.depot
        ? {
            id: driver.depot.id,
            name: driver.depot.name,
          }
        : driver.vehicle
          ? {
              id: driver.vehicle.depot.id,
              name: driver.vehicle.depot.name,
            }
          : null,
    };
  }
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
