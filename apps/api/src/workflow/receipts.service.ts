import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PlanningService } from "../planning/planning.service";
import { DecisionsService } from "../planning/decisions.service";
import { ConnectedOrdersService } from "./orders.service";
import { FieldService } from "./field.service";
import type { Actor } from "../auth/auth.service";
import { fail } from "../common/api-error";
import { version } from "../planning/planning.input";
import { object, list, text, count, refs, unique } from "./input";
import type { Prisma } from "../generated/prisma/client";
type StoredReceipt = Prisma.ReceiptGetPayload<{ include: { lines: true } }>;
@Injectable()
export class ConnectedReceiptsService {
  constructor(
    private readonly db: PrismaService,
    private readonly planning: PlanningService,
    private readonly decisions: DecisionsService,
    private readonly orders: ConnectedOrdersService,
    private readonly field: FieldService,
  ) {}
  private view(r: StoredReceipt) {
    return {
      id: r.id,
      deliveryId: r.deliveryId,
      status: r.status,
      confirmedById: r.confirmedById,
      confirmedAt: r.confirmedAt?.toISOString() ?? null,
      lines: r.lines.map((l) => ({
        orderLineId: l.orderLineId,
        acceptedQty: l.acceptedQty,
        damagedQty: l.damagedQty,
        missingQty: l.missingQty,
        note: l.note,
        photoRefs: l.photoRefs,
      })),
    };
  }
  async get(actor: Actor, id: string) {
    const d = await this.db.delivery.findUnique({
      where: { id },
      include: { stop: true, receipt: { include: { lines: true } } },
    });
    if (!d) fail(404, "NOT_FOUND", "Delivery not found.");
    await this.orders.orderAccess(this.db, actor, d.stop.orderId);
    if (!d.receipt) fail(404, "NOT_FOUND", "Receipt not confirmed yet.");
    return this.view(d.receipt);
  }
  async confirm(actor: Actor, id: string, input: unknown) {
    const body = object(input),
      expected = version(body.expectedDeliveryVersion),
      lines = list(body.lines).map((l) => ({
        orderLineId: text(l.orderLineId, "orderLineId"),
        acceptedQty: count(l.acceptedQty),
        damagedQty: count(l.damagedQty),
        missingQty: count(l.missingQty),
        note: l.note === null ? null : text(l.note, "note"),
        photoRefs: refs(l.photoRefs),
      }));
    unique(lines.map((l) => l.orderLineId));
    return this.planning.mutate(
      actor,
      "CONFIRM_RECEIPT",
      id,
      body,
      async (tx) => {
        const d = await tx.delivery.findUnique({
          where: { id },
          include: {
            stop: { include: { order: true, lines: true } },
            receipt: true,
          },
        });
        if (!d) fail(404, "NOT_FOUND", "Delivery not found.");
        if (
          actor.role !== "STORE_MANAGER" ||
          actor.outletId !== d.stop.order.outletId
        )
          fail(403, "FORBIDDEN", "Only this outlet may confirm its receipt.");
        if (d.version !== expected)
          fail(
            409,
            "STALE_DELIVERY",
            "Delivery changed; refresh before confirming.",
          );
        if (d.receipt)
          fail(
            409,
            "RECEIPT_EXISTS",
            "This attempt already has a confirmed receipt.",
          );
        if (
          d.outcome === "FAILED" ||
          !d.stop.lines.some((l) => (l.deliveredQty ?? 0) > 0)
        )
          fail(
            422,
            "NO_HANDOVER",
            "A failed attempt without handover does not have a receipt.",
          );
        if (
          lines.length !== d.stop.lines.length ||
          d.stop.lines.some((l) => {
            const r = lines.find((x) => x.orderLineId === l.orderLineId);
            return (
              !r ||
              l.deliveredQty === null ||
              r.acceptedQty + r.damagedQty + r.missingQty !== l.deliveredQty
            );
          })
        )
          fail(
            422,
            "RECEIPT_QUANTITY_MISMATCH",
            "Accepted, damaged and missing must equal this attempt’s handover, excluding already returned goods.",
          );
        await this.field.proofRefs(
          tx,
          actor,
          d.stop.orderId,
          lines.flatMap((l) => l.photoRefs),
        );
        const issues = lines.flatMap((l) => [
          ...(l.damagedQty
            ? [
                {
                  orderLineId: l.orderLineId,
                  issueType: "DAMAGED",
                  note: l.note,
                  photoRef: l.photoRefs[0] ?? null,
                },
              ]
            : []),
          ...(l.missingQty
            ? [
                {
                  orderLineId: l.orderLineId,
                  issueType: "MISSING",
                  note: l.note,
                  photoRef: l.photoRefs[0] ?? null,
                },
              ]
            : []),
        ]);
        const receipt = await tx.receipt.create({
          data: {
            deliveryId: id,
            confirmedById: actor.id,
            confirmedAt: new Date(),
            status: issues.length ? "CONFIRMED_WITH_ISSUE" : "CONFIRMED",
            lines: { create: lines },
            issues: { create: issues },
          },
          include: { lines: true },
        });
        await tx.delivery.update({
          where: { id },
          data: { version: { increment: 1 } },
        });
        for (const line of lines) {
          const attempts = await tx.tripStopLine.findMany({
            where: { orderLineId: line.orderLineId },
            include: {
              stop: {
                include: {
                  delivery: {
                    include: { receipt: { include: { lines: true } } },
                  },
                },
              },
            },
          });
          const total = attempts.reduce(
            (sum, a) =>
              sum +
              (a.stop.delivery?.receipt?.lines.find(
                (r) => r.orderLineId === line.orderLineId,
              )?.acceptedQty ??
                a.deliveredQty ??
                0),
            0,
          );
          await tx.orderLine.update({
            where: { id: line.orderLineId },
            data: { deliveredQty: total },
          });
        }
        await tx.order.update({
          where: { id: d.stop.orderId },
          data: { version: { increment: 1 } },
        });
        await this.decisions.reconcileOrder(tx, d.stop.orderId);
        await this.planning.audit(
          tx,
          actor,
          "Receipt",
          receipt.id,
          "CONFIRMED",
          { deliveryId: id, lines },
        );
        return this.view(receipt);
      },
    );
  }
}
