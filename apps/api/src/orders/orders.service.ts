import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { OrderStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateOrderInput } from './catalog';
import { scheduleOrder } from './operating-day';
import { StoreUser } from './store-auth.guard';

const orderDetails = {
  outlet: true,
  lines: true,
  stops: { include: { trip: { include: { vehicle: true } }, delivery: { include: { lines: true, pod: true, receipt: { include: { lines: true } } } } }, orderBy: { createdAt: 'asc' } },
} as const;

function dateOnly(value: Date | null): string | null { return value?.toISOString().slice(0, 10) ?? null; }

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: StoreUser, body: unknown, now = new Date()) {
    const outlet = await this.prisma.outlet.findUnique({ where: { id: user.outletId } });
    if (!outlet) throw new ForbiddenException({ code: 'OUTLET_NOT_FOUND', message: 'Your account has no active outlet.', details: [] });
    const input = validateOrderInput(body, outlet.brand);
    const requestHash = createHash('sha256').update(JSON.stringify({ requestedDate: input.submittedDate, temp: input.temp, lines: input.lines })).digest('hex');
    const existing = await this.prisma.order.findUnique({ where: { clientActionId: input.clientActionId }, include: orderDetails });
    if (existing) {
      if (existing.outletId !== user.outletId || existing.requestHash !== requestHash) throw new ConflictException({ code: 'ACTION_ID_REUSED', message: 'This clientActionId belongs to a different order.', details: [] });
      return this.toResponse(existing);
    }
    const schedule = scheduleOrder(input.submittedDate, now);
    try {
      const order = await this.prisma.$transaction(async tx => {
        const saved = await tx.order.create({
          data: {
            clientActionId: input.clientActionId, requestHash,
            outletId: user.outletId, createdById: user.id,
            requestedDate: new Date(`${schedule.requestedDate}T00:00:00.000Z`),
            temp: input.temp, units: input.units, weightKg: input.weightKg, volumeM3: input.volumeM3,
            status: OrderStatus.CONFIRMED, lines: { create: input.lines },
          },
          include: orderDetails,
        });
        await tx.auditEvent.create({ data: { actorId: user.id, entityType: 'Order', entityId: saved.id, action: 'ORDER_CONFIRMED', reason: schedule.rolledOver ? 'Moved to the next eligible operating run.' : null, payload: { submittedDate: input.submittedDate, scheduledDate: schedule.requestedDate } } });
        return saved;
      });
      return { ...this.toResponse(order), cutoffRolledOver: schedule.rolledOver };
    } catch (error) {
      // A concurrent retry can win the unique clientActionId race.
      const saved = await this.prisma.order.findUnique({ where: { clientActionId: input.clientActionId }, include: orderDetails });
      if (saved && saved.outletId === user.outletId && saved.requestHash === requestHash) return this.toResponse(saved);
      throw error;
    }
  }

  async list(user: StoreUser) {
    const orders = await this.prisma.order.findMany({ where: { outletId: user.outletId }, include: orderDetails, orderBy: { createdAt: 'desc' } });
    return orders.map(order => this.toResponse(order));
  }

  async findOne(user: StoreUser, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderDetails });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.', details: [] });
    if (order.outletId !== user.outletId) throw new ForbiddenException({ code: 'WRONG_OUTLET', message: 'You cannot access another outlet’s order.', details: [] });
    const timeline = await this.prisma.auditEvent.findMany({ where: { entityType: 'Order', entityId: id }, orderBy: { createdAt: 'asc' } });
    return { ...this.toResponse(order), timeline };
  }

  private toResponse(order: Prisma.OrderGetPayload<{ include: typeof orderDetails }>) {
    return {
      id: order.id, version: order.version, outletId: order.outletId, brand: order.outlet.brand, temp: order.temp,
      requestedDate: dateOnly(order.requestedDate), plannedDate: dateOnly(order.plannedDate), status: order.status,
      units: order.units, weightKg: order.weightKg, volumeM3: order.volumeM3,
      lines: order.lines.map(line => ({ id: line.id, item: line.item, unit: line.unit, requestedQty: line.requestedQty, cancelledQty: line.cancelledQty, deliveredQty: line.deliveredQty })),
      activeTripId: order.activeTripId, attemptStopIds: order.stops.map(stop => stop.id), recoveryPending: order.recoveryPending,
      deferralCount: order.deferralCount, deferReason: order.deferReason, deferredToDate: dateOnly(order.deferredToDate),
      attempts: order.stops, createdAt: order.createdAt, updatedAt: order.updatedAt,
    };
  }
}
