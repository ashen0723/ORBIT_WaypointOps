import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { OrderStatus, Prisma, ReceiptStatus, StopStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StoreUser } from '../orders/store-auth.guard';

interface ReceiptLineInput {
  orderLineId: string;
  acceptedQty: number;
  damagedQty: number;
  missingQty: number;
  note: string | null;
  photoRefs: string[];
}

function invalid(message: string): never { throw new BadRequestException({ code: 'INVALID_RECEIPT', message, details: [] }); }

function validateReceipt(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Provide a receipt object.');
  const body = value as Record<string, unknown>;
  if (typeof body.clientActionId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.clientActionId)) invalid('Provide a valid clientActionId.');
  if (!Number.isSafeInteger(body.expectedDeliveryVersion) || (body.expectedDeliveryVersion as number) < 1) invalid('Provide a valid expectedDeliveryVersion.');
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 100) invalid('Provide between 1 and 100 receipt lines.');
  const seen = new Set<string>();
  const lines: ReceiptLineInput[] = body.lines.map((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid(`Receipt line ${index + 1} is invalid.`);
    const line = raw as Record<string, unknown>;
    if (typeof line.orderLineId !== 'string' || !line.orderLineId || seen.has(line.orderLineId)) invalid('Each order line must appear once.');
    seen.add(line.orderLineId);
    for (const key of ['acceptedQty', 'damagedQty', 'missingQty']) {
      if (!Number.isSafeInteger(line[key]) || (line[key] as number) < 0) invalid(`Receipt line ${index + 1} has an invalid ${key}.`);
    }
    if (line.note !== null && (typeof line.note !== 'string' || line.note.length > 1000)) invalid('Note must be null or at most 1000 characters.');
    if (!Array.isArray(line.photoRefs) || line.photoRefs.length > 10 || line.photoRefs.some((ref: unknown) => typeof ref !== 'string' || !ref || ref.length > 500)) invalid('photoRefs must contain valid references.');
    return { orderLineId: line.orderLineId, acceptedQty: line.acceptedQty as number, damagedQty: line.damagedQty as number, missingQty: line.missingQty as number, note: line.note as string | null, photoRefs: line.photoRefs as string[] };
  });
  return { clientActionId: body.clientActionId as string, expectedDeliveryVersion: body.expectedDeliveryVersion as number, lines };
}

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(user: StoreUser, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId }, include: { stop: { include: { order: true } }, receipt: { include: { lines: true } } } });
    if (!delivery) throw new NotFoundException({ code: 'DELIVERY_NOT_FOUND', message: 'Delivery not found.', details: [] });
    if (delivery.stop.order.outletId !== user.outletId) throw new ForbiddenException({ code: 'WRONG_OUTLET', message: 'You cannot access another outlet’s delivery.', details: [] });
    if (!delivery.receipt) throw new NotFoundException({ code: 'RECEIPT_NOT_FOUND', message: 'Receipt not found.', details: [] });
    return delivery.receipt;
  }

  async confirm(user: StoreUser, deliveryId: string, body: unknown) {
    const input = validateReceipt(body);
    const requestHash = createHash('sha256').update(JSON.stringify({ deliveryId, version: input.expectedDeliveryVersion, lines: [...input.lines].sort((a, b) => a.orderLineId.localeCompare(b.orderLineId)) })).digest('hex');
    const existing = await this.prisma.receipt.findUnique({ where: { clientActionId: input.clientActionId }, include: { delivery: { include: { stop: { include: { order: true } } } }, lines: true } });
    if (existing) {
      if (existing.deliveryId !== deliveryId || existing.delivery.stop.order.outletId !== user.outletId || existing.requestHash !== requestHash) throw new ConflictException({ code: 'ACTION_ID_REUSED', message: 'This clientActionId belongs to another receipt.', details: [] });
      return existing;
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const delivery = await tx.delivery.findUnique({ where: { id: deliveryId }, include: { lines: true, stop: { include: { order: { include: { lines: true } } } }, receipt: true } });
        if (!delivery) throw new NotFoundException({ code: 'DELIVERY_NOT_FOUND', message: 'Delivery not found.', details: [] });
        const order = delivery.stop.order;
        if (order.outletId !== user.outletId) throw new ForbiddenException({ code: 'WRONG_OUTLET', message: 'You cannot access another outlet’s delivery.', details: [] });
        if (delivery.receipt?.confirmedAt) throw new ConflictException({ code: 'RECEIPT_CONFIRMED', message: 'This delivery already has a receipt.', details: [] });
        if (delivery.version !== input.expectedDeliveryVersion) throw new ConflictException({ code: 'DELIVERY_VERSION_CHANGED', message: 'Delivery changed; refresh and retry.', details: [] });
        if ((delivery.outcome !== StopStatus.DELIVERED && delivery.outcome !== StopStatus.PARTIAL) || delivery.lines.length === 0) throw new ConflictException({ code: 'NOT_DELIVERED', message: 'A completed handover is required.', details: [] });
        const driverLines = new Map(delivery.lines.map(line => [line.orderLineId, line]));
        if (driverLines.size !== input.lines.length) invalid('Receipt must include every delivered line exactly once.');
        for (const line of input.lines) {
          const driverLine = driverLines.get(line.orderLineId);
          if (!driverLine || line.acceptedQty + line.damagedQty + line.missingQty !== driverLine.deliveredQty) invalid('Receipt quantities must equal the Driver’s recorded handover for each line.');
        }
        const hasIssue = input.lines.some(line => line.damagedQty > 0 || line.missingQty > 0);
        const receipt = await tx.receipt.create({
          data: { deliveryId, clientActionId: input.clientActionId, requestHash, confirmedById: user.id, confirmedAt: new Date(), status: hasIssue ? ReceiptStatus.CONFIRMED_WITH_ISSUE : ReceiptStatus.CONFIRMED, lines: { create: input.lines } },
          include: { lines: true },
        });
        const allStops = await tx.tripStop.findMany({ where: { orderId: order.id }, include: { delivery: { include: { receipt: true } } } });
        const allHandoversReceipted = allStops.every(stop => !stop.delivery || (stop.delivery.outcome !== StopStatus.DELIVERED && stop.delivery.outcome !== StopStatus.PARTIAL) || Boolean(stop.delivery.receipt?.confirmedAt));
        const outstanding = order.lines.reduce((sum, line) => sum + line.requestedQty - line.cancelledQty - line.deliveredQty, 0);
        if (!hasIssue && !order.recoveryPending && outstanding <= 0 && allHandoversReceipted && order.status === OrderStatus.DELIVERED) {
          await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.RECEIVED, version: { increment: 1 } } });
        }
        await tx.auditEvent.create({ data: { actorId: user.id, entityType: 'Order', entityId: order.id, action: 'RECEIPT_CONFIRMED', payload: { deliveryId, receiptId: receipt.id, status: receipt.status } } });
        return receipt;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const saved = await this.prisma.receipt.findUnique({ where: { clientActionId: input.clientActionId }, include: { delivery: { include: { stop: { include: { order: true } } } }, lines: true } });
      if (saved && saved.deliveryId === deliveryId && saved.delivery.stop.order.outletId === user.outletId && saved.requestHash === requestHash) return saved;
      throw error;
    }
  }
}
