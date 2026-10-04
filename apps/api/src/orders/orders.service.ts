import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TempRequirement } from '../generated/prisma/client';
import type { RequestUser } from '../auth/request-user';
import { integer, invalid, isoDate, objectBody, text } from '../common/validation';
import { ORDER_CATALOG } from './catalog';
import { OrderPolicyService } from './order-policy.service';

export const ORDER_INCLUDE = { outlet: true, lines: { orderBy: { id: 'asc' as const } }, stop: { include: {
  trip: { include: { vehicle: true } }, delivery: { include: { pod: true, receipt: { include: { items: true, issues: true } } } },
} } } satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly policy: OrderPolicyService) {}
  private scope(user: RequestUser) {
    if (user.role === 'STORE_MANAGER' && user.outletId) return { outletId: user.outletId };
    if (user.role === 'DISPATCHER') return user.depotId ? { outlet: { depotId: user.depotId } } : {};
    throw new ForbiddenException({ code: 'ORDER_ACCESS_DENIED', message: 'You cannot access this order queue.' });
  }
  async list(user: RequestUser, query: Record<string, unknown>) {
    const body = objectBody(query, ['status', 'requestedDate', 'limit', 'offset']);
    const limit = body.limit === undefined ? 50 : this.pageNumber(body.limit, 'limit', 1, 100);
    const offset = body.offset === undefined ? 0 : this.pageNumber(body.offset, 'offset', 0, 100000);
    const allowed = ['CONFIRMED', 'PLANNED', 'LOADING', 'READY', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED', 'DEFERRED'];
    if (body.status !== undefined && !allowed.includes(String(body.status))) invalid('Unknown order status.');
    const where: Prisma.OrderWhereInput = { ...this.scope(user),
      ...(body.status === undefined ? {} : { status: body.status as Prisma.OrderWhereInput['status'] }),
      ...(body.requestedDate === undefined ? {} : { requestedDate: new Date(`${isoDate(body.requestedDate)}T00:00:00Z`) }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit, skip: offset }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, limit, offset };
  }
  private pageNumber(value: unknown, name: string, min: number, max: number) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) invalid(`${name} must be a whole number.`);
    return integer(Number(value), name, min, max);
  }
  async findOne(user: RequestUser, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, ...this.scope(user) }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found or not accessible.' });
    const timeline = await this.prisma.auditEvent.findMany({ where: { entityType: 'Order', entityId: id }, orderBy: { createdAt: 'asc' } });
    return { ...order, timeline };
  }
  async catalog(user: RequestUser) {
    if (user.role !== 'STORE_MANAGER' || !user.outletId) throw new ForbiddenException({ code: 'STORE_ACCESS_REQUIRED', message: 'A Store Manager account is required.' });
    const outlet = await this.prisma.outlet.findUnique({ where: { id: user.outletId } });
    if (!outlet) throw new NotFoundException({ code: 'OUTLET_NOT_FOUND', message: 'Your outlet was not found.' });
    return ORDER_CATALOG.filter(item => item.brand === outlet.brand);
  }
  async create(user: RequestUser, input: unknown) {
    if (user.role !== 'STORE_MANAGER' || !user.outletId) throw new ForbiddenException({ code: 'STORE_ACCESS_REQUIRED', message: 'A Store Manager account with an outlet is required.' });
    const body = objectBody(input, ['requestedDate', 'temp', 'lines', 'clientActionId']);
    const requestedDate = isoDate(body.requestedDate);
    if (body.temp !== 'AMBIENT' && body.temp !== 'CHILLED') invalid('temp must be AMBIENT or CHILLED.');
    const temp = body.temp as TempRequirement;
    if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 100) invalid('Provide 1 to 100 order lines.');
    const lines = body.lines.map((raw, index) => {
      const line = objectBody(raw, ['item', 'unit', 'requestedQty']);
      return { item: text(line.item, `lines[${index}].item`, 120), unit: text(line.unit, 'unit', 20), requestedQty: integer(line.requestedQty, 'requestedQty', 1, 10000) };
    });
    if (new Set(lines.map(line => line.item.toLowerCase())).size !== lines.length) invalid('Combine duplicate items into one order line.');
    const actionId = body.clientActionId === undefined ? null : text(body.clientActionId, 'clientActionId', 100);
    const fingerprint = createHash('sha256').update(JSON.stringify({ requestedDate, temp, lines })).digest('hex');
    if (actionId) {
      const replay = await this.prisma.order.findUnique({ where: { clientActionId: actionId }, include: ORDER_INCLUDE });
      if (replay) return this.replay(user, replay, fingerprint);
    }
    const outlet = await this.prisma.outlet.findUnique({ where: { id: user.outletId } });
    if (!outlet) throw new NotFoundException({ code: 'OUTLET_NOT_FOUND', message: 'Your outlet was not found.' });
    if (outlet.brand !== 'FRESH' && temp === 'CHILLED') throw new UnprocessableEntityException({ code: 'CHILLED_NOT_ALLOWED', message: 'Only Fresh outlets may order chilled goods.' });
    let weightKg = 0, volumeM3 = 0;
    for (const line of lines) {
      const product = ORDER_CATALOG.find(item => item.name === line.item && item.brand === outlet.brand && item.temp === temp && item.unit === line.unit);
      if (!product) throw new UnprocessableEntityException({ code: 'INVALID_CATALOG_ITEM', message: `${line.item} is not a valid ${temp.toLowerCase()} item/unit for your outlet.` });
      weightKg += product.kg * line.requestedQty;
      volumeM3 += product.m3 * line.requestedQty;
    }
    const scheduling = await this.policy.scheduling(requestedDate);
    try {
      const order = await this.prisma.$transaction(async tx => {
        const saved = await tx.order.create({ data: {
          outletId: outlet.id, createdById: user.id, requestedDate: new Date(`${scheduling.effectiveDate}T00:00:00Z`), temp,
          units: lines.reduce((sum, line) => sum + line.requestedQty, 0), weightKg: Number(weightKg.toFixed(4)), volumeM3: Number(volumeM3.toFixed(6)),
          clientActionId: actionId, lines: { create: lines },
        }, include: ORDER_INCLUDE });
        await tx.auditEvent.create({ data: { actorId: user.id, entityType: 'Order', entityId: saved.id, action: 'ORDER_CONFIRMED',
          reason: scheduling.rolledOver ? 'Submitted after cutoff; queued for the following eligible run.' : null,
          payload: { fingerprint, scheduling },
        } });
        return saved;
      });
      return { ...order, scheduling };
    } catch (error) {
      if (actionId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const saved = await this.prisma.order.findUnique({ where: { clientActionId: actionId }, include: ORDER_INCLUDE });
        if (saved) return this.replay(user, saved, fingerprint);
      }
      throw error;
    }
  }
  private async replay(user: RequestUser, order: Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>, fingerprint: string) {
    const event = await this.prisma.auditEvent.findFirst({ where: { entityType: 'Order', entityId: order.id, action: 'ORDER_CONFIRMED' } });
    const payload = event?.payload as { fingerprint?: string; scheduling?: unknown } | null;
    if (order.createdById !== user.id || payload?.fingerprint !== fingerprint) throw new ConflictException({ code: 'ACTION_ID_REUSED', message: 'Use a new clientActionId for a different order.' });
    return { ...order, scheduling: payload.scheduling, replayed: true };
  }
}
