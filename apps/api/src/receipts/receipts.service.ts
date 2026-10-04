import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, StopStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/request-user';
import { OrdersService } from '../orders/orders.service';
import { integer, invalid, objectBody, text } from '../common/validation';

const RECEIPT_INCLUDE = { items: true, issues: true } satisfies Prisma.ReceiptInclude;
@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService, private readonly orders: OrdersService) {}
  async get(user: RequestUser, orderId: string) {
    const order = await this.orders.findOne(user, orderId);
    const receipt = order.stop?.delivery?.receipt;
    if (!receipt) throw new NotFoundException({ code: 'RECEIPT_NOT_FOUND', message: 'No receipt has been confirmed for this order.' });
    return receipt;
  }
  async confirm(user: RequestUser, input: unknown) {
    if (user.role !== 'STORE_MANAGER' || !user.outletId) throw new ForbiddenException({ code: 'STORE_ACCESS_REQUIRED', message: 'A Store Manager account with an outlet is required.' });
    const body = objectBody(input, ['deliveryId', 'checks']);
    const deliveryId = text(body.deliveryId, 'deliveryId', 100);
    if (!Array.isArray(body.checks) || body.checks.length < 1 || body.checks.length > 100) invalid('Provide a check for every order line.');
    const checks = body.checks.map(raw => {
      const check = objectBody(raw, ['orderLineId', 'result', 'receivedQty', 'issueType', 'note', 'evidenceId']);
      const orderLineId = text(check.orderLineId, 'orderLineId', 100);
      if (check.result !== 'OK' && check.result !== 'ISSUE') invalid('result must be OK or ISSUE.');
      const result = check.result as 'OK' | 'ISSUE';
      const receivedQty = integer(check.receivedQty, 'receivedQty');
      const issueType = result === 'ISSUE' ? text(check.issueType, 'issueType', 30) : null;
      if (issueType && !['MISSING', 'DAMAGED', 'WRONG_ITEM', 'OTHER'].includes(issueType)) invalid('Unknown receipt issue type.');
      const note = result === 'ISSUE' ? text(check.note, 'note', 2000) : null;
      const evidenceId = check.evidenceId == null ? null : text(check.evidenceId, 'evidenceId', 100);
      if (result === 'OK' && (check.issueType != null || check.note != null || evidenceId)) invalid('OK checks cannot contain issue details.');
      return { orderLineId, result, receivedQty, issueType, note, evidenceId };
    }).sort((a, b) => a.orderLineId.localeCompare(b.orderLineId));
    if (new Set(checks.map(check => check.orderLineId)).size !== checks.length) invalid('Each order line must be checked exactly once.');
    const fingerprint = createHash('sha256').update(JSON.stringify({ deliveryId, checks })).digest('hex');
    try {
      return await this.prisma.$transaction(async tx => {
        const delivery = await tx.delivery.findFirst({ where: { id: deliveryId, stop: { order: { outletId: user.outletId ?? '' } } }, include: {
          receipt: { include: RECEIPT_INCLUDE }, stop: { include: { order: { include: { lines: true } } } },
        } });
        if (!delivery) throw new NotFoundException({ code: 'DELIVERY_NOT_FOUND', message: 'Delivery not found or not accessible.' });
        const order = delivery.stop.order;
        if (delivery.receipt && delivery.receipt.status !== 'PENDING') {
          const event = await tx.auditEvent.findFirst({ where: { entityType: 'Receipt', entityId: delivery.receipt.id, action: 'RECEIPT_CONFIRMED' } });
          if ((event?.payload as { fingerprint?: string } | null)?.fingerprint === fingerprint) return { ...delivery.receipt, replayed: true };
          throw new ConflictException({ code: 'RECEIPT_ALREADY_CONFIRMED', message: 'This receipt has already been confirmed with different checks.' });
        }
        if (![StopStatus.DELIVERED, StopStatus.PARTIAL].includes(delivery.outcome as 'DELIVERED' | 'PARTIAL') || !delivery.completedAt) {
          throw new ConflictException({ code: 'DELIVERY_NOT_COMPLETE', message: 'Receipt can be confirmed after a full or partial delivery.' });
        }
        if (order.status !== 'DELIVERED' && !(delivery.outcome === 'PARTIAL' && order.status === 'IN_TRANSIT')) {
          throw new ConflictException({ code: 'INVALID_ORDER_STATE', message: 'This order is not ready for receipt confirmation.' });
        }
        const lines = new Map(order.lines.map(line => [line.id, line]));
        if (checks.length !== lines.size || checks.some(check => !lines.has(check.orderLineId))) {
          throw new BadRequestException({ code: 'INVALID_RECEIPT_LINES', message: 'Check every line of this order exactly once, without unrelated lines.' });
        }
        for (const check of checks) {
          const line = lines.get(check.orderLineId)!;
          if (check.result === 'OK' && (check.receivedQty !== line.requestedQty || (line.deliveredQty !== null && line.deliveredQty !== check.receivedQty))) {
            throw new UnprocessableEntityException({ code: 'RECEIPT_DISCREPANCY_REQUIRED', message: `Report an issue for ${line.item} when its quantity differs.` });
          }
          if (check.evidenceId) {
            const evidence = await tx.receiptEvidence.findFirst({ where: { id: check.evidenceId, orderId: order.id, uploadedById: user.id } });
            if (!evidence) throw new BadRequestException({ code: 'INVALID_EVIDENCE', message: 'Use a photo uploaded for this order by your account.' });
          }
        }
        const flagged = checks.filter(check => check.result === 'ISSUE');
        const confirmedAt = new Date();
        const changed = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: 'RECEIVED' } });
        if (changed.count !== 1) throw new ConflictException({ code: 'ORDER_CHANGED', message: 'The order changed. Refresh and try again.' });
        const receipt = await tx.receipt.upsert({ where: { deliveryId }, create: {
          deliveryId, confirmedById: user.id, confirmedAt, status: flagged.length ? 'CONFIRMED_WITH_ISSUE' : 'CONFIRMED',
        }, update: { confirmedById: user.id, confirmedAt, status: flagged.length ? 'CONFIRMED_WITH_ISSUE' : 'CONFIRMED' } });
        await tx.receiptItem.createMany({ data: checks.map(check => ({ receiptId: receipt.id, orderLineId: check.orderLineId, result: check.result, receivedQty: check.receivedQty })) });
        if (flagged.length) await tx.receiptIssue.createMany({ data: flagged.map(check => ({
          receiptId: receipt.id, orderLineId: check.orderLineId, issueType: check.issueType!, note: check.note, photoRef: check.evidenceId,
        })) });
        await tx.auditEvent.create({ data: { actorId: user.id, entityType: 'Receipt', entityId: receipt.id, action: 'RECEIPT_CONFIRMED', payload: { fingerprint } } });
        await tx.auditEvent.create({ data: { actorId: user.id, entityType: 'Order', entityId: order.id, action: 'ORDER_RECEIVED',
          reason: flagged.length ? 'Receipt confirmed with discrepancies.' : 'All items received correctly.', payload: { receiptId: receipt.id } } });
        return tx.receipt.findUniqueOrThrow({ where: { id: receipt.id }, include: RECEIPT_INCLUDE });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
        throw new ConflictException({ code: 'RECEIPT_CONFLICT', message: 'Another confirmation is being saved. Retry the same request or refresh the order.' });
      }
      throw error;
    }
  }
}
