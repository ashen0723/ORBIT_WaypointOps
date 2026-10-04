import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getDriverProfile(userId: string) {
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

    if (!driver || driver.role !== 'DRIVER') {
      throw new NotFoundException('Driver not found');
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
}