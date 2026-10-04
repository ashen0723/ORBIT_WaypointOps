import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type {
  DeliveryOutcomePayload,
  DeliveryView,
  FieldAction,
  SyncActionResult,
  ApiErrorBody,
} from "@waypoint/contracts";
import { Prisma, type Delivery } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PlanningService, json } from "../planning/planning.service";
import { DecisionsService } from "../planning/decisions.service";
import { ConnectedOrdersService } from "./orders.service";
import type { Actor } from "../auth/auth.service";
import { fail } from "../common/api-error";
import { version } from "../planning/planning.input";
import {
  object,
  text,
  instant,
  count,
  list,
  refs,
  unique,
  page,
  paged,
} from "./input";
type Tx = Prisma.TransactionClient;
export type UploadedEvidence = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};
@Injectable()
export class FieldService {
  constructor(
    private readonly db: PrismaService,
    private readonly planning: PlanningService,
    private readonly decisions: DecisionsService,
    private readonly orders: ConnectedOrdersService,
  ) {}
  async evidence(actor: Actor, input: unknown, file?: UploadedEvidence) {
    const body = object(input),
      orderId = text(body.orderId, "orderId"),
      tripId = body.tripId ? text(body.tripId, "tripId") : null;
    if (!file || file.size <= 0 || file.size > 10 * 1024 * 1024)
      fail(400, "INVALID_EVIDENCE", "Upload an image up to 10 MiB.");
    const b = file.buffer;
    const mime = b
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : b[0] === 255 && b[1] === 216 && b[2] === 255
        ? "image/jpeg"
        : b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : null;
    if (!mime || mime !== file.mimetype)
      fail(
        422,
        "INVALID_EVIDENCE",
        "File bytes must match PNG, JPEG or WebP content type.",
      );
    const hash = createHash("sha256").update(b).digest("hex");
    return this.planning.mutate(
      actor,
      "UPLOAD_EVIDENCE",
      orderId,
      { ...body, hash, mediaType: mime },
      async (tx) => {
        await this.orders.orderAccess(tx, actor, orderId);
        if (actor.role === "DRIVER") {
          const trip = tripId ? await this.planning.loadTrip(tx, tripId) : null;
          if (
            !trip ||
            trip.driverId !== actor.id ||
            !trip.stops.some((s) => s.orderId === orderId)
          )
            fail(
              403,
              "FORBIDDEN",
              "Evidence must belong to an assigned delivery attempt.",
            );
        }
        const saved = await tx.evidence.create({
          data: {
            ownerId: actor.id,
            orderId,
            tripId,
            mediaType: mime,
            sizeBytes: file.size,
            bytes: new Uint8Array(b),
          },
        });
        return { evidenceId: saved.id, mediaType: mime, sizeBytes: file.size };
      },
    );
  }
  async getEvidence(actor: Actor, id: string) {
    const evidence = await this.db.evidence.findUnique({ where: { id } });
    if (!evidence) fail(404, "NOT_FOUND", "Evidence not found.");
    await this.orders.orderAccess(this.db, actor, evidence.orderId);
    return evidence;
  }
  async proofRefs(
    tx: Tx,
    actor: Actor,
    orderId: string,
    ids: string[],
    tripId?: string,
  ) {
    const uniqueIds = [...new Set(ids)];
    const evidence = await tx.evidence.findMany({
      where: {
        id: { in: uniqueIds },
        ownerId: actor.id,
        orderId,
        ...(tripId ? { tripId } : {}),
      },
    });
    if (evidence.length !== uniqueIds.length)
      fail(
        403,
        "INVALID_EVIDENCE_SCOPE",
        "Evidence is missing or belongs to another account/order/attempt.",
      );
  }
  async depart(actor: Actor, id: string, input: unknown) {
    const body = object(input),
      expected = version(body.expectedPlanVersion);
    return this.planning.mutate(actor, "DEPART", id, body, async (tx) => {
      const trip = await this.planning.loadTrip(tx, id);
      if (trip.driverId !== actor.id || actor.vehicleId !== trip.vehicleId)
        fail(403, "FORBIDDEN", "Only the assigned Driver can depart.");
      if (trip.planVersion !== expected)
        fail(409, "STALE_PLAN", "Refresh the current plan.");
      if (
        trip.status !== "READY" ||
        trip.releasedAt ||
        !trip.publishedAt ||
        trip.loaderAcknowledgedPlanVersion !== expected ||
        trip.departedAt
      )
        fail(
          409,
          "TRIP_NOT_READY",
          "The current published plan must be acknowledged and READY.",
        );
      const record = await tx.loadingRecord.findUnique({
        where: { tripId: id },
        include: { issues: true },
      });
      if (
        !record ||
        record.status !== "COMPLETED" ||
        record.issues.some((i) => i.status !== "RESOLVED") ||
        trip.stops
          .filter((s) => s.active)
          .some((s) =>
            s.lines.some(
              (l) =>
                l.loadedQty === null ||
                l.loadedQty !== l.plannedQty - l.cancelledQty ||
                l.pendingUnload,
            ),
          )
      )
        fail(409, "LOADING_INCOMPLETE", "Loading checks are incomplete.");
      if (
        await tx.trip.findFirst({
          where: {
            vehicleId: trip.vehicleId,
            status: "IN_TRANSIT",
            releasedAt: null,
          },
        })
      )
        fail(
          409,
          "VEHICLE_CONFLICT",
          "This vehicle already has a trip in progress.",
        );
      await tx.trip.update({
        where: { id },
        data: {
          status: "IN_TRANSIT",
          departedAt: new Date(),
          departedPlanVersion: expected,
          committedFuelL: { increment: trip.reservedFuelL },
          reservedFuelL: 0,
          version: { increment: 1 },
        },
      });
      await tx.order.updateMany({
        where: { stops: { some: { tripId: id, active: true } } },
        data: { status: "IN_TRANSIT", version: { increment: 1 } },
      });
      await this.planning.audit(tx, actor, "Trip", id, "DEPARTED", {
        planVersion: expected,
        committedFuelL: trip.reservedFuelL,
      });
      return this.planning.tripView(await this.planning.loadTrip(tx, id));
    });
  }
  private payload(input: unknown): DeliveryOutcomePayload {
    const d = object(input),
      lines = list(d.lines).map((l) => ({
        orderLineId: text(l.orderLineId, "orderLineId"),
        deliveredQty: count(l.deliveredQty),
        returnedQty: count(l.returnedQty),
      }));
    unique(lines.map((l) => l.orderLineId));
    if (d.outcome === "FAILED") {
      if (d.proof !== undefined)
        fail(
          400,
          "INVALID_INPUT",
          "Failed delivery must not claim a receiver signature.",
        );
      const photoRefs = refs(d.photoRefs);
      if (!photoRefs.length || lines.some((l) => l.deliveredQty !== 0))
        fail(
          422,
          "INVALID_OUTCOME",
          "Failure needs an attempt photo and zero handover.",
        );
      return {
        outcome: "FAILED",
        lines: lines as [(typeof lines)[number], ...typeof lines],
        reason: text(d.reason, "reason"),
        photoRefs: photoRefs as [string, ...string[]],
      };
    }
    if (d.outcome !== "DELIVERED" && d.outcome !== "PARTIAL")
      fail(400, "INVALID_INPUT", "Choose DELIVERED, PARTIAL or FAILED.");
    const p = object(d.proof),
      recipientName = text(p.recipientName, "recipientName"),
      photoRefs = refs(p.photoRefs);
    const proof =
      p.signatureRef === null
        ? {
            recipientName,
            signatureRef: null,
            photoRefs: photoRefs as [string, ...string[]],
            signatureExceptionReason: text(
              p.signatureExceptionReason,
              "signatureExceptionReason",
            ),
          }
        : {
            recipientName,
            signatureRef: text(p.signatureRef, "signatureRef"),
            photoRefs,
          };
    if (p.signatureRef === null && !photoRefs.length)
      fail(
        422,
        "PROOF_REQUIRED",
        "A signature exception requires a photo and reason.",
      );
    const delivered = lines.reduce((n, l) => n + l.deliveredQty, 0),
      returned = lines.reduce((n, l) => n + l.returnedQty, 0);
    if (
      delivered <= 0 ||
      (d.outcome === "DELIVERED" && returned !== 0) ||
      (d.outcome === "PARTIAL" && returned <= 0)
    )
      fail(
        422,
        "INVALID_OUTCOME",
        "Outcome must match actual delivered and returned quantities.",
      );
    if (d.outcome === "DELIVERED") {
      if (d.damageReported !== false)
        fail(400, "INVALID_INPUT", "A full delivery must not report damage.");
      return {
        outcome: "DELIVERED",
        lines: lines as [(typeof lines)[number], ...typeof lines],
        proof,
        damageReported: false,
      };
    }
    if (
      typeof d.damageReported !== "boolean" ||
      (d.damageReported && !photoRefs.length)
    )
      fail(422, "DAMAGE_PHOTO_REQUIRED", "Damage needs a photo.");
    return {
      outcome: "PARTIAL",
      lines: lines as [(typeof lines)[number], ...typeof lines],
      proof,
      reason: text(d.reason, "reason"),
      damageReported: d.damageReported,
    };
  }
  private async context(
    tx: Tx,
    actor: Actor,
    stopId: string,
    expected: number,
  ) {
    const stop = await tx.tripStop.findUnique({
      where: { id: stopId },
      include: { trip: true, lines: true, delivery: true },
    });
    if (!stop) fail(404, "NOT_FOUND", "Stop not found.");
    if (stop.trip.driverId !== actor.id || actor.role !== "DRIVER")
      fail(403, "FORBIDDEN", "Stop is not assigned to this Driver.");
    if (
      !stop.trip.departedAt ||
      !stop.trip.departedPlanVersion ||
      expected < stop.trip.departedPlanVersion ||
      expected > stop.trip.planVersion
    )
      fail(
        409,
        "INVALID_FIELD_PLAN",
        "This plan version was not an assigned departed plan.",
      );
    return stop;
  }
  private async validateOutcome(
    tx: Tx,
    actor: Actor,
    stop: Awaited<ReturnType<FieldService["context"]>>,
    payload: DeliveryOutcomePayload,
  ) {
    if (
      payload.lines.length !== stop.lines.length ||
      stop.lines.some(
        (l) =>
          l.loadedQty === null ||
          payload.lines.find((x) => x.orderLineId === l.orderLineId)
            ?.deliveredQty! +
            payload.lines.find((x) => x.orderLineId === l.orderLineId)
              ?.returnedQty! !==
            l.loadedQty,
      )
    )
      fail(
        422,
        "QUANTITY_MISMATCH",
        "Every loaded line must reconcile delivered plus returned quantities.",
      );
    const ids =
      payload.outcome === "FAILED"
        ? payload.photoRefs
        : [
            ...payload.proof.photoRefs,
            ...(payload.proof.signatureRef ? [payload.proof.signatureRef] : []),
          ];
    await this.proofRefs(tx, actor, stop.orderId, ids, stop.tripId);
  }
  async field(
    actor: Actor,
    kind: "ARRIVE" | "OUTCOME",
    stopId: string,
    input: unknown,
  ) {
    const body = object(input),
      expected = version(body.expectedPlanVersion),
      capturedAt = instant(body.capturedAt);
    const payload =
      kind === "OUTCOME" ? this.payload(body.delivery) : undefined;
    return this.planning.mutate(actor, kind, stopId, body, async (tx) => {
      const stop = await this.context(tx, actor, stopId, expected);
      if (payload) await this.validateOutcome(tx, actor, stop, payload);
      if (expected !== stop.trip.planVersion) {
        const action =
          kind === "OUTCOME"
            ? { kind, stopId, request: { ...body, delivery: payload } }
            : { kind, stopId, request: body };
        const conflict = await tx.fieldConflict.create({
          data: {
            userId: actor.id,
            clientActionId: text(body.clientActionId, "clientActionId"),
            currentPlanVersion: stop.trip.planVersion,
            action: json(action),
          },
        });
        await this.planning.audit(
          tx,
          actor,
          "FieldConflict",
          conflict.id,
          "CAPTURED",
          {
            stopId,
            expectedPlanVersion: expected,
            currentPlanVersion: stop.trip.planVersion,
          },
        );
        await this.decisions.reconcileOrder(tx, stop.orderId);
        return { status: "CONFLICT" as const, conflictId: conflict.id };
      }
      if (kind === "ARRIVE") {
        if (!stop.arrivedAt)
          await tx.tripStop.update({
            where: { id: stopId },
            data: {
              arrivedAt: new Date(capturedAt),
              ...(stop.status === "PLANNED"
                ? { status: "ARRIVED" as const }
                : {}),
            },
          });
        return {
          status: "SYNCED" as const,
          entityId: stopId,
          value: this.planning
            .tripView(await this.planning.loadTrip(tx, stop.tripId))
            .stops.find((s) => s.id === stopId)!,
        };
      }
      if (
        stop.trip.status !== "IN_TRANSIT" ||
        !stop.active ||
        stop.delivery ||
        !["PLANNED", "ARRIVED"].includes(stop.status)
      )
        fail(
          409,
          "STOP_ALREADY_TERMINAL",
          "The current attempt has ended; refresh its recorded outcome.",
        );
      const delivery = await this.applyOutcome(
        tx,
        actor,
        stopId,
        payload!,
        capturedAt,
        text(body.clientActionId, "clientActionId"),
      );
      return {
        status: "SYNCED" as const,
        entityId: delivery.id,
        value: this.deliveryView(delivery, stop.orderId),
      };
    });
  }
  private deliveryView(d: Delivery, orderId: string): DeliveryView {
    if (!d.recorded || !d.capturedAt)
      fail(
        422,
        "LEGACY_DELIVERY",
        "Backfill this delivery’s immutable recorded payload before viewing it.",
      );
    return {
      id: d.id,
      stopId: d.stopId,
      orderId,
      version: d.version,
      outcome: d.outcome as DeliveryView["outcome"],
      recorded: d.recorded as unknown as DeliveryOutcomePayload,
      capturedAt: d.capturedAt.toISOString(),
      recordedAt: d.createdAt.toISOString(),
      requiresDispatcherReview: d.requiresDispatcherReview,
    };
  }
  async getDelivery(actor: Actor, id: string) {
    const d = await this.db.delivery.findUnique({
      where: { id },
      include: { stop: true },
    });
    if (!d) fail(404, "NOT_FOUND", "Delivery not found.");
    await this.orders.orderAccess(this.db, actor, d.stop.orderId);
    return this.deliveryView(d, d.stop.orderId);
  }
  async orderDeliveries(actor: Actor, id: string) {
    await this.orders.orderAccess(this.db, actor, id);
    const items = await this.db.delivery.findMany({
      where: { stop: { orderId: id } },
      orderBy: { createdAt: "asc" },
      include: { stop: { select: { arrivedAt: true } } },
    });
    return {
      items: items.map((d) => ({
        ...this.deliveryView(d, id),
        arrivedAt: d.stop.arrivedAt?.toISOString() ?? null,
      })),
      nextCursor: null,
    };
  }
  private async applyOutcome(
    tx: Tx,
    actor: Actor,
    stopId: string,
    payload: DeliveryOutcomePayload,
    capturedAt: string,
    clientActionId: string,
  ) {
    const stop = await tx.tripStop.findUniqueOrThrow({
      where: { id: stopId },
      include: { lines: true },
    });
    const delivery = await tx.delivery.create({
      data: {
        stopId,
        outcome: payload.outcome,
        reason: "reason" in payload ? payload.reason : null,
        recorded: json(payload),
        capturedAt: new Date(capturedAt),
        completedAt: new Date(capturedAt),
        clientActionId: `${actor.id}:${clientActionId}`,
        requiresDispatcherReview:
          payload.outcome !== "FAILED" && payload.proof.signatureRef === null,
      },
    });
    for (const l of payload.lines)
      await tx.tripStopLine.update({
        where: { stopId_orderLineId: { stopId, orderLineId: l.orderLineId } },
        data: {
          deliveredQty: l.deliveredQty,
          returnedQty: l.returnedQty,
          version: { increment: 1 },
        },
      });
    if (payload.outcome !== "FAILED")
      await tx.proofOfDelivery.create({
        data: {
          deliveryId: delivery.id,
          recipientName: payload.proof.recipientName,
          signatureRef: payload.proof.signatureRef,
          photoRef: payload.proof.photoRefs[0] ?? null,
          capturedAt: new Date(capturedAt),
        },
      });
    await tx.tripStop.update({
      where: { id: stopId },
      data: {
        active: false,
        status: payload.outcome,
        reschedule: Prisma.DbNull,
      },
    });
    await tx.order.update({
      where: { id: stop.orderId },
      data: { pendingQuantities: Prisma.DbNull, version: { increment: 1 } },
    });
    for (const l of payload.lines) {
      const attempts = await tx.tripStopLine.findMany({
        where: { orderLineId: l.orderLineId },
        include: {
          stop: {
            include: {
              delivery: { include: { receipt: { include: { lines: true } } } },
            },
          },
        },
      });
      const deliveredQty = attempts.reduce(
        (n, a) =>
          n +
          (a.stop.delivery?.receipt?.lines.find(
            (r) => r.orderLineId === l.orderLineId,
          )?.acceptedQty ??
            a.deliveredQty ??
            0),
        0,
      );
      await tx.orderLine.update({
        where: { id: l.orderLineId },
        data: { deliveredQty },
      });
    }
    await this.decisions.reconcileOrder(tx, stop.orderId);
    const stops = await tx.tripStop.findMany({
      where: { tripId: stop.tripId, sequence: { gt: 0 } },
      include: { lines: true, delivery: true },
    });
    if (stops.every((s) => !["PLANNED", "ARRIVED"].includes(s.status)))
      await tx.trip.update({
        where: { id: stop.tripId },
        data: {
          status: stops.some(
            (s) =>
              s.status !== "DELIVERED" ||
              s.lines.some((l) => l.cancelledQty > 0) ||
              s.delivery?.requiresDispatcherReview,
          )
            ? "COMPLETED_WITH_EXCEPTIONS"
            : "COMPLETED",
          version: { increment: 1 },
        },
      });
    await this.planning.audit(tx, actor, "Delivery", delivery.id, "RECORDED", {
      stopId,
      payload,
      capturedAt,
    });
    return delivery;
  }
  async direct(
    actor: Actor,
    kind: "ARRIVE" | "OUTCOME",
    id: string,
    body: unknown,
  ) {
    const result = await this.field(actor, kind, id, body);
    if (result.status === "CONFLICT")
      fail(409, "STALE_PLAN", "Evidence preserved for Dispatcher review.", [
        {
          code: "STALE_PLAN",
          message: "Recorded facts need reconciliation.",
          field: "expectedPlanVersion",
          entityId: result.conflictId,
        },
      ]);
    return result.value;
  }
  async sync(actor: Actor, input: unknown) {
    const body = object(input),
      actions = list(body.actions);
    if (actions.length > 100)
      fail(400, "INVALID_INPUT", "At most100 actions per batch.");
    const results: SyncActionResult[] = [],
      blocked = new Set<string>();
    for (const raw of actions) {
      const request = object(raw.request),
        key = text(request.clientActionId, "clientActionId"),
        stopId =
          raw.kind === "ISSUE"
            ? text(request.tripId, "tripId")
            : text(raw.stopId, "stopId");
      if (blocked.has(stopId)) {
        results.push({
          clientActionId: key,
          status: "FAILED",
          retryable: true,
          error: {
            code: "DEPENDENCY_BLOCKED",
            message: "An earlier action for this target needs attention.",
            details: [],
          },
        });
        continue;
      }
      try {
        if (
          raw.kind !== "ARRIVE" &&
          raw.kind !== "OUTCOME" &&
          raw.kind !== "ISSUE"
        )
          fail(400, "INVALID_INPUT", "Unsupported field action.");
        const replayed = !!(await this.db.mutationRecord.findUnique({
          where: {
            actorId_clientActionId: { actorId: actor.id, clientActionId: key },
          },
        }));
        const result =
          raw.kind === "ISSUE"
            ? await this.issue(actor, request)
            : await this.field(
                actor,
                raw.kind as "ARRIVE" | "OUTCOME",
                stopId,
                request,
              );
        if (result.status === "CONFLICT") {
          blocked.add(stopId);
          results.push({
            clientActionId: key,
            status: "CONFLICT",
            conflictId: result.conflictId,
            evidencePreserved: true,
            error: {
              code: "STALE_PLAN",
              message: "Recorded facts preserved for review.",
              details: [],
            },
          });
        } else
          results.push({
            clientActionId: key,
            status: "SYNCED",
            entityId: result.entityId,
            replayed,
            recordedAt: (
              await this.db.mutationRecord.findUniqueOrThrow({
                where: {
                  actorId_clientActionId: {
                    actorId: actor.id,
                    clientActionId: key,
                  },
                },
              })
            ).createdAt.toISOString(),
          });
      } catch (error) {
        blocked.add(stopId);
        const e = error as {
          getStatus?: () => number;
          getResponse?: () => unknown;
        };
        const status = e.getStatus?.() ?? 500;
        results.push({
          clientActionId: key,
          status: "FAILED",
          retryable: status >= 500,
          error: (e.getResponse?.() ?? {
            code: "TEMPORARY_FAILURE",
            message: "Retry when the service is available.",
            details: [],
          }) as ApiErrorBody,
        });
      }
    }
    return { results };
  }
  async issue(actor: Actor, input: unknown) {
    const body = object(input),
      tripId = text(body.tripId, "tripId"),
      expected = version(body.expectedPlanVersion),
      capturedAt = instant(body.capturedAt);
    const stopId = body.stopId === null ? null : text(body.stopId, "stopId"),
      note = text(body.note, "note"),
      photoRefs = refs(body.photoRefs);
    if (
      ![
        "BREAKDOWN",
        "DELAY",
        "ROAD_BLOCKED",
        "REFRIGERATION",
        "OUTLET_CLOSED",
        "ACCIDENT",
        "OTHER",
      ].includes(String(body.type))
    )
      fail(400, "INVALID_INPUT", "Unknown incident type.");
    return this.planning.mutate(actor, "ISSUE", tripId, body, async (tx) => {
      const trip = await this.planning.loadTrip(tx, tripId);
      if (
        trip.driverId !== actor.id ||
        !trip.departedAt ||
        !trip.departedPlanVersion ||
        expected < trip.departedPlanVersion ||
        expected > trip.planVersion
      )
        fail(403, "FORBIDDEN", "Incident needs an assigned departed plan.");
      if (stopId && !trip.stops.some((s) => s.id === stopId))
        fail(422, "INVALID_STOP", "Stop does not belong to this trip.");
      const evidence = await tx.evidence.count({
        where: {
          id: { in: [...new Set(photoRefs)] },
          ownerId: actor.id,
          tripId,
          orderId: {
            in: trip.stops
              .filter((s) => !stopId || s.id === stopId)
              .map((s) => s.orderId),
          },
        },
      });
      if (evidence !== new Set(photoRefs).size)
        fail(
          403,
          "INVALID_EVIDENCE_SCOPE",
          "Incident evidence belongs to another attempt.",
        );
      const recorded = { ...body, note, photoRefs, capturedAt };
      if (expected !== trip.planVersion) {
        const c = await tx.fieldConflict.create({
          data: {
            userId: actor.id,
            clientActionId: text(body.clientActionId, "clientActionId"),
            currentPlanVersion: trip.planVersion,
            action: json({ kind: "ISSUE", request: recorded }),
          },
        });
        await this.planning.audit(
          tx,
          actor,
          "FieldConflict",
          c.id,
          "CAPTURED",
          { tripId },
        );
        for (const s of trip.stops)
          await this.decisions.reconcileOrder(tx, s.orderId);
        return { status: "CONFLICT" as const, conflictId: c.id };
      }
      const issue = await tx.driverIssue.create({
        data: {
          tripId,
          stopId,
          userId: actor.id,
          recorded: json(recorded),
          capturedAt: new Date(capturedAt),
        },
      });
      await this.planning.audit(
        tx,
        actor,
        "DriverIssue",
        issue.id,
        "REPORTED",
        { tripId },
      );
      return {
        status: "SYNCED" as const,
        entityId: issue.id,
        value: {
          ...recorded,
          id: issue.id,
          reportedById: actor.id,
          recordedAt: issue.recordedAt.toISOString(),
        },
      };
    });
  }
  async issues(actor: Actor, tripId: string) {
    await this.planning.getTrip(actor, tripId);
    const items = await this.db.driverIssue.findMany({
      where: { tripId },
      orderBy: { recordedAt: "asc" },
    });
    return {
      items: items.map((i) => ({
        ...object(i.recorded),
        id: i.id,
        reportedById: i.userId,
        recordedAt: i.recordedAt.toISOString(),
      })),
      nextCursor: null,
    };
  }
  async conflicts(query: Record<string, unknown>) {
    const { limit, cursor } = page(query);
    const items = await this.db.fieldConflict.findMany({
      where: { resolvedAt: null, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: limit + 1,
    });
    return paged(
      items.map((c) => ({
        ...c,
        recordedAt: c.recordedAt.toISOString(),
        resolvedAt: null,
      })),
      limit,
    );
  }
  async resolve(actor: Actor, id: string, input: unknown) {
    const body = object(input),
      expected = version(body.expectedVersion),
      reason = text(body.reason, "reason");
    if (
      body.resolution !== "ACCEPT_RECORDED_FACT" &&
      body.resolution !== "RETAIN_FOR_INVESTIGATION"
    )
      fail(400, "INVALID_INPUT", "Unknown resolution.");
    return this.planning.mutate(
      actor,
      "RESOLVE_CONFLICT",
      id,
      body,
      async (tx) => {
        const conflict = await tx.fieldConflict.findUnique({ where: { id } });
        if (!conflict) fail(404, "NOT_FOUND", "Conflict not found.");
        if (conflict.version !== expected || conflict.resolvedAt)
          fail(409, "STALE_CONFLICT", "Conflict changed or was resolved.");
        if (body.resolution === "RETAIN_FOR_INVESTIGATION") {
          const result = await tx.fieldConflict.update({
            where: { id },
            data: {
              version: { increment: 1 },
              resolution: json({
                resolution: body.resolution,
                reason,
                actorId: actor.id,
              }),
            },
          });
          await this.planning.audit(
            tx,
            actor,
            "FieldConflict",
            id,
            "REVIEW_RETAINED",
            {},
            reason,
          );
          return {
            ...result,
            recordedAt: result.recordedAt.toISOString(),
            resolvedAt: null,
          };
        }
        const action = conflict.action as unknown as FieldAction;
        if (action.kind === "ISSUE") {
          const r = action.request;
          await tx.driverIssue.create({
            data: {
              tripId: r.tripId,
              stopId: r.stopId,
              userId: conflict.userId,
              recorded: json(r),
              capturedAt: new Date(r.capturedAt),
            },
          });
          const resolved = await tx.fieldConflict.update({
            where: { id },
            data: {
              version: { increment: 1 },
              resolvedAt: new Date(),
              resolution: json({
                resolution: body.resolution,
                reason,
                actorId: actor.id,
              }),
            },
          });
          await this.planning.audit(
            tx,
            actor,
            "FieldConflict",
            id,
            "RESOLVED",
            { resolution: body.resolution },
            reason,
          );
          const affected = await tx.tripStop.findMany({
            where: { tripId: r.tripId },
            select: { orderId: true },
          });
          for (const s of affected)
            await this.decisions.reconcileOrder(tx, s.orderId);
          return {
            ...resolved,
            recordedAt: resolved.recordedAt.toISOString(),
            resolvedAt: resolved.resolvedAt!.toISOString(),
          };
        }
        const stop = await tx.tripStop.findUniqueOrThrow({
          where: { id: action.stopId },
          include: { trip: true, lines: true, delivery: true },
        });
        if (stop.delivery && action.kind === "OUTCOME")
          fail(
            409,
            "EXISTING_DELIVERY",
            "A recorded delivery cannot be overwritten; retain for investigation.",
          );
        const replacement = await tx.tripStop.findFirst({
          where: { orderId: stop.orderId, active: true, id: { not: stop.id } },
          include: { trip: true, lines: true },
        });
        if (replacement && action.kind === "OUTCOME") {
          const activeStops = await tx.tripStop.count({
            where: { tripId: replacement.tripId, active: true },
          });
          if (
            replacement.trip.departedAt ||
            replacement.lines.some((l) => (l.loadedQty ?? 0) > 0) ||
            activeStops !== 1
          )
            fail(
              409,
              "REPLAN_REQUIRED",
              "Safely amend/release the replacement trip first, or retain for investigation.",
            );
          await tx.tripStop.update({
            where: { id: replacement.id },
            data: { active: false, status: "RESCHEDULED" },
          });
          await tx.trip.update({
            where: { id: replacement.tripId },
            data: {
              releasedAt: new Date(),
              reservedFuelL: 0,
              loaderAcknowledgedPlanVersion: null,
              version: { increment: 1 },
              planVersion: { increment: 1 },
            },
          });
          await this.planning.audit(
            tx,
            actor,
            "Trip",
            replacement.tripId,
            "SUPERSEDED_BY_RECORDED_FACT",
            { conflictId: id },
            reason,
          );
        }
        if (action.kind === "OUTCOME") {
          const driver = await tx.user.findUniqueOrThrow({
            where: { id: conflict.userId },
          });
          await this.planning.audit(
            tx,
            actor,
            "TripStop",
            stop.id,
            "RECONCILED_BEFORE",
            { reschedule: stop.reschedule, lines: stop.lines },
            reason,
          );
          await this.applyOutcome(
            tx,
            driver,
            stop.id,
            this.payload(action.request.delivery),
            instant(action.request.capturedAt),
            action.request.clientActionId,
          );
        } else if (!stop.arrivedAt)
          await tx.tripStop.update({
            where: { id: stop.id },
            data: {
              arrivedAt: new Date(action.request.capturedAt),
              ...(stop.status === "PLANNED"
                ? { status: "ARRIVED" as const }
                : {}),
            },
          });
        const result = await tx.fieldConflict.update({
          where: { id },
          data: {
            version: { increment: 1 },
            resolvedAt: new Date(),
            resolution: json({
              resolution: body.resolution,
              reason,
              actorId: actor.id,
            }),
          },
        });
        await this.decisions.reconcileOrder(tx, stop.orderId);
        await this.planning.audit(
          tx,
          actor,
          "FieldConflict",
          id,
          "RESOLVED",
          { resolution: body.resolution },
          reason,
        );
        return {
          ...result,
          recordedAt: result.recordedAt.toISOString(),
          resolvedAt: result.resolvedAt!.toISOString(),
        };
      },
    );
  }
  async review(actor: Actor, id: string, input: unknown) {
    const body = object(input),
      expected = version(body.expectedVersion),
      reason = text(body.reason, "reason");
    return this.planning.mutate(
      actor,
      "REVIEW_DELIVERY",
      id,
      body,
      async (tx) => {
        const d = await tx.delivery.findUnique({
          where: { id },
          include: { stop: true },
        });
        if (!d) fail(404, "NOT_FOUND", "Delivery not found.");
        if (d.version !== expected)
          fail(409, "STALE_DELIVERY", "Delivery version changed.");
        await tx.delivery.update({
          where: { id },
          data: { requiresDispatcherReview: false, version: { increment: 1 } },
        });
        await tx.order.update({
          where: { id: d.stop.orderId },
          data: { version: { increment: 1 } },
        });
        await this.decisions.reconcileOrder(tx, d.stop.orderId);
        await this.planning.audit(
          tx,
          actor,
          "Delivery",
          id,
          "EVIDENCE_REVIEWED",
          {},
          reason,
        );
        return { id, version: expected + 1 };
      },
    );
  }
}
