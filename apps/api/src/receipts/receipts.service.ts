import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, ReceiptStatus, StopStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StoreUser } from '../orders/store-auth.guard';

interface IssueInput { orderLineId: string; issueType: string; note?: string; photoRef?: string }

function validateIssues(value: unknown): IssueInput[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException({ code: 'INVALID_ISSUES', message: 'Provide an issues object.', details: [] });
  const issues = (value as Record<string, unknown>).issues;
  if (!Array.isArray(issues) || issues.length === 0 || issues.length > 100) throw new BadRequestException({ code: 'INVALID_ISSUES', message: 'Provide between 1 and 100 issues.', details: [] });
  return issues.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException({ code: 'INVALID_ISSUES', message: `Issue ${index + 1} is invalid.`, details: [] });
    const issue = raw as Record<string, unknown>;
    const issueType = typeof issue.issueType === 'string' ? issue.issueType.toUpperCase() : '';
    if (typeof issue.orderLineId !== 'string' || !issue.orderLineId || !['MISSING', 'DAMAGED', 'WRONG_ITEM'].includes(issueType) ||
        (issue.note !== undefined && (typeof issue.note !== 'string' || issue.note.length > 1000)) ||
        (issue.photoRef !== undefined && (typeof issue.photoRef !== 'string' || issue.photoRef.length > 500))) {
      throw new BadRequestException({ code: 'INVALID_ISSUES', message: `Issue ${index + 1} needs an order line and valid issue type.`, details: [] });
    }
    return { orderLineId: issue.orderLineId, issueType, note: issue.note as string | undefined, photoRef: issue.photoRef as string | undefined };
  });
}

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDelivery(user: StoreUser, id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { stop: { include: { order: { include: { lines: true } } } }, receipt: { include: { issues: true } } },
    });
    if (!delivery) throw new NotFoundException({ code: 'DELIVERY_NOT_FOUND', message: 'Delivery not found.', details: [] });
    if (delivery.stop.order.outletId !== user.outletId) throw new ForbiddenException({ code: 'WRONG_OUTLET', message: 'You cannot access another outlet’s delivery.', details: [] });
    return delivery;
  }

  private requireDelivered(delivery: Awaited<ReturnType<ReceiptsService['getDelivery']>>) {
    if ((delivery.outcome !== StopStatus.DELIVERED && delivery.outcome !== StopStatus.PARTIAL) || delivery.stop.order.status !== OrderStatus.DELIVERED) {
      throw new ConflictException({ code: 'NOT_DELIVERED', message: 'The delivery must be completed before receipt.', details: [] });
    }
  }

  async reportIssues(user: StoreUser, deliveryId: string, body: unknown) {
    const issues = validateIssues(body);
    const delivery = await this.getDelivery(user, deliveryId);
    if (delivery.receipt?.confirmedAt) throw new ConflictException({ code: 'RECEIPT_CONFIRMED', message: 'This receipt is already confirmed.', details: [] });
    this.requireDelivered(delivery);
    const lineIds = new Set(delivery.stop.order.lines.map(line => line.id));
    if (issues.some(issue => !lineIds.has(issue.orderLineId))) throw new BadRequestException({ code: 'WRONG_ORDER_LINE', message: 'Every issue must refer to an item in this order.', details: [] });
    return this.prisma.$transaction(async tx => {
      const receipt = await tx.receipt.upsert({
        where: { deliveryId },
        create: { deliveryId, confirmedById: user.id, status: ReceiptStatus.PENDING },
        update: { confirmedById: user.id },
      });
      await tx.receiptIssue.deleteMany({ where: { receiptId: receipt.id } });
      await tx.receiptIssue.createMany({ data: issues.map(issue => ({ ...issue, receiptId: receipt.id })) });
      await tx.auditEvent.create({ data: { actorId: user.id, entityType: 'Order', entityId: delivery.stop.order.id, action: 'RECEIPT_ISSUES_REPORTED', payload: { deliveryId, issueCount: issues.length } } });
      return tx.receipt.findUnique({ where: { id: receipt.id }, include: { issues: true } });
    });
  }

  async confirm(user: StoreUser, deliveryId: string) {
    const delivery = await this.getDelivery(user, deliveryId);
    if (delivery.receipt?.confirmedAt) return delivery.receipt;
    this.requireDelivered(delivery);
    const orderId = delivery.stop.order.id;
    return this.prisma.$transaction(async tx => {
      const changed = await tx.order.updateMany({ where: { id: orderId, outletId: user.outletId, status: OrderStatus.DELIVERED }, data: { status: OrderStatus.RECEIVED } });
      if (changed.count !== 1) throw new ConflictException({ code: 'ORDER_CHANGED', message: 'Order status changed; refresh and retry.', details: [] });
      const status = delivery.receipt?.issues.length ? ReceiptStatus.CONFIRMED_WITH_ISSUE : ReceiptStatus.CONFIRMED;
      const receipt = await tx.receipt.upsert({
        where: { deliveryId },
        create: { deliveryId, confirmedById: user.id, status, confirmedAt: new Date() },
        update: { confirmedById: user.id, status, confirmedAt: new Date() },
        include: { issues: true },
      });
      await tx.auditEvent.create({ data: { actorId: user.id, entityType: 'Order', entityId: orderId, action: 'RECEIPT_CONFIRMED', payload: { deliveryId, receiptId: receipt.id, status } } });
      return receipt;
    });
  }
}
