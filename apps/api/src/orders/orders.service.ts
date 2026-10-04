import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateOrderInput } from './catalog';
import { scheduleOrder } from './operating-day';
import { StoreUser } from './store-auth.guard';

const orderDetails = {
  outlet: true,
  lines: true,
  stop: {
    include: {
      trip: { include: { vehicle: true } },
      delivery: { include: { pod: true, receipt: { include: { issues: true } } } },
    },
  },
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: StoreUser, body: unknown, now = new Date()) {
    const outlet = await this.prisma.outlet.findUnique({ where: { id: user.outletId } });
    if (!outlet) throw new ForbiddenException({ code: 'OUTLET_NOT_FOUND', message: 'Your account has no active outlet.', details: [] });
    const input = validateOrderInput(body, outlet.brand);
    const schedule = scheduleOrder(input.submittedDate, now);
    const order = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.order.create({
        data: {
          outletId: user.outletId,
          createdById: user.id,
          requestedDate: new Date(`${schedule.requestedDate}T00:00:00.000Z`),
          temp: input.temp,
          units: input.units,
          weightKg: input.weightKg,
          volumeM3: input.volumeM3,
          status: OrderStatus.CONFIRMED,
          lines: { create: input.lines },
        },
        include: { lines: true },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'Order',
          entityId: saved.id,
          action: 'ORDER_CONFIRMED',
          reason: schedule.rolledOver ? 'Moved to the next eligible operating run.' : null,
          payload: { submittedDate: input.submittedDate, scheduledDate: schedule.requestedDate },
        },
      });
      return saved;
    });
    return { ...order, cutoffRolledOver: schedule.rolledOver };
  }

  list(user: StoreUser) {
    return this.prisma.order.findMany({
      where: { outletId: user.outletId },
      include: { lines: true, stop: { include: { delivery: { include: { receipt: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: StoreUser, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderDetails });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.', details: [] });
    if (order.outletId !== user.outletId) {
      throw new ForbiddenException({ code: 'WRONG_OUTLET', message: 'You cannot access another outlet’s order.', details: [] });
    }
    const timeline = await this.prisma.auditEvent.findMany({
      where: { entityType: 'Order', entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { ...order, timeline };
  }
}
