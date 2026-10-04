import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VehicleTemp, VehicleType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Explicit projection excludes drivers, user details and operational child records.
const vehicleSelect = {
  id: true, type: true, temp: true, weightCapKg: true, volumeCapM3: true,
  fuelType: true, kmPerL: true, weeklyFuelQuotaL: true, depotId: true, available: true,
} as const satisfies Prisma.VehicleSelect;

function text(query: Record<string, unknown>, key: string): string | undefined {
  const value = query[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${key} must be a non-empty string`);
  }
  return value;
}

function parseDate(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    throw new BadRequestException('date must be a valid YYYY-MM-DD date');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('date must be a valid YYYY-MM-DD date');
  }
  return date;
}

function selection(date?: Date) {
  return {
    ...vehicleSelect,
    ...(date ? { trips: {
      where: { date }, orderBy: { tripNo: 'asc' as const },
      select: { id: true, date: true, tripNo: true, status: true, plannedDeparture: true,
        totalWeightKg: true, totalVolumeM3: true, distanceKm: true },
    } } : {}),
  } satisfies Prisma.VehicleSelect;
}

type SelectedVehicle = Prisma.VehicleGetPayload<{ select: ReturnType<typeof selection> }>;

function response(vehicle: SelectedVehicle, date?: Date) {
  if (!date) return vehicle;
  const tripCountForDate = vehicle.trips.length;
  return {
    ...vehicle, tripCountForDate,
    remainingTripSlots: Math.max(0, 2 - tripCountForDate),
    schedulable: vehicle.available && tripCountForDate < 2,
  };
}

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown> = {}) {
    const depot = text(query, 'depot');
    const depotId = text(query, 'depotId');
    if (depot !== undefined && depotId !== undefined && depot !== depotId) {
      throw new BadRequestException('depot and depotId must agree');
    }
    const available = text(query, 'available');
    if (available !== undefined && available !== 'true' && available !== 'false') {
      throw new BadRequestException('available must be true or false');
    }
    const type = text(query, 'type');
    const temp = text(query, 'temp');
    if (type !== undefined && !Object.values(VehicleType).includes(type as VehicleType)) {
      throw new BadRequestException('type must be TRUCK or VAN');
    }
    if (temp !== undefined && !Object.values(VehicleTemp).includes(temp as VehicleTemp)) {
      throw new BadRequestException('temp must be REEFER or AMBIENT');
    }
    const date = parseDate(text(query, 'date'));
    const selectedDepotId = depotId ?? depot;
    const where: Prisma.VehicleWhereInput = {
      ...(selectedDepotId !== undefined ? { depotId: selectedDepotId } : {}),
      ...(available !== undefined ? { available: available === 'true' } : {}),
      ...(type !== undefined ? { type: type as VehicleType } : {}),
      ...(temp !== undefined ? { temp: temp as VehicleTemp } : {}),
    };
    const vehicles = await this.prisma.vehicle.findMany({ where, select: selection(date), orderBy: { id: 'asc' } });
    return vehicles.map(vehicle => response(vehicle, date));
  }

  async get(id: string, query: Record<string, unknown> = {}) {
    const date = parseDate(text(query, 'date'));
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id }, select: selection(date) });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return response(vehicle, date);
  }
}
