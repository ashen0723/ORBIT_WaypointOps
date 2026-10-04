import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AllocatePlanResponse, PlanInput, PlanDraftView, TripView, OrderView, ValidatePlanResponse } from '@waypoint/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Actor } from '../auth/auth.service';
import { fail } from '../common/api-error';
import { nextQuantities, remainingLines } from './quantity-plan';
import { evaluatePlan } from './planning.engine';
import { date, localInstant, object, planInput, text, version, weekStart } from './planning.input';

type Tx = Prisma.TransactionClient;
export const tripInclude = { stops: { orderBy: { sequence: 'asc' as const }, include: { lines: true, order: true } } };
type StoredTrip = Prisma.TripGetPayload<{ include: typeof tripInclude }>;
export const orderInclude = { outlet: true, lines: true, stops: true };
type StoredOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

@Injectable()
export class PlanningService {
  constructor(private readonly db: PrismaService) {}

  // The ledger result and business writes commit together. Serialization failures re-run validation.
  async mutate<T>(actor: Actor, kind: string, target: string, body: Record<string, unknown>, work: (tx: Tx) => Promise<T>): Promise<T> {
    const key = text(body.clientActionId, 'clientActionId');
    const hash = createHash('sha256').update(canonical({ kind, target, body })).digest('hex');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(async tx => {
          const saved = await tx.mutationRecord.findUnique({ where: { actorId_clientActionId: { actorId: actor.id, clientActionId: key } } });
          if (saved) {
            if (saved.requestHash !== hash) fail(409, 'IDEMPOTENCY_KEY_REUSED', 'Use a new clientActionId for a different action or payload.');
            return saved.response as T;
          }
          const result = await work(tx);
          await tx.mutationRecord.create({ data: { actorId: actor.id, clientActionId: key, requestHash: hash, response: json(result) } });
          return result;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== 'P2034' && code !== 'P2002') throw error;
        if (attempt === 2) fail(409, 'CONCURRENT_CHANGE', 'Another request changed these reservations. Refresh and retry.');
      }
    }
    throw new Error('Unreachable');
  }
  async audit(tx: Tx, actor: Actor, entityType: string, entityId: string, action: string, payload: unknown, reason?: string) {
    await tx.auditEvent.create({ data: { actorId: actor.id, entityType, entityId, action, payload: json(payload), reason } });
  }
  private draftView(d: { id: string; version: number; plan: Prisma.JsonValue; updatedAt: Date; allocatedTripId: string | null }): PlanDraftView {
    return { id: d.id, version: d.version, plan: planInput(d.plan), updatedAt: d.updatedAt.toISOString(), allocatedTripId: d.allocatedTripId };
  }
  async listDrafts(actor: Actor, query: Record<string, unknown>) {
    const limit=query.limit===undefined?50:Number(query.limit);
    if(!Number.isInteger(limit)||limit<1||limit>100) fail(400,'INVALID_INPUT','limit must be 1 to 100.');
    const cursor=query.cursor===undefined?undefined:text(query.cursor,'cursor');
    const rows=await this.db.planDraft.findMany({where:{createdById:actor.id,...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:'asc'},take:limit+1});
    return {items:rows.slice(0,limit).map(d=>this.draftView(d)),nextCursor:rows.length>limit?rows[limit-1].id:null};
  }
  async saveDraft(actor: Actor, input: unknown) {
    const body = object(input), plan = planInput(body.plan);
    return this.mutate(actor, 'SAVE_DRAFT', '', body, async tx => {
      const draft = await tx.planDraft.create({ data: { plan: json(plan), createdById: actor.id } });
      await this.audit(tx, actor, 'PlanDraft', draft.id, 'CREATED', plan);
      return this.draftView(draft);
    });
  }
  async getDraft(id: string) {
    const draft = await this.db.planDraft.findUnique({ where: { id } });
    if (!draft) fail(404, 'NOT_FOUND', 'Draft not found.');
    return this.draftView(draft);
  }
  async updateDraft(actor: Actor, id: string, input: unknown) {
    const body = object(input), plan = planInput(body.plan), expected = version(body.expectedVersion);
    return this.mutate(actor, 'UPDATE_DRAFT', id, body, async tx => {
      const draft = await tx.planDraft.findUnique({ where: { id } });
      if (!draft) fail(404, 'NOT_FOUND', 'Draft not found.');
      if (draft.version !== expected || draft.allocatedTripId) fail(409, 'DRAFT_CONFLICT', 'Draft changed or was already allocated.');
      const updated = await tx.planDraft.update({ where: { id }, data: { plan: json(plan), version: { increment: 1 } } });
      await this.audit(tx, actor, 'PlanDraft', id, 'UPDATED', plan);
      return this.draftView(updated);
    });
  }
  private async evaluate(tx: Tx, plan: PlanInput, replacingTripId?: string) {
    const [vehicle, orders, trips, operatingDay, availability] = await Promise.all([
      tx.vehicle.findUnique({ where: { id: plan.vehicleId }, include: { drivers: { where: { role: 'DRIVER', active: true }, select: { id: true } } } }),
      tx.order.findMany({ where: { id: { in: plan.orderIds } }, include: { outlet: true, lines: true, stops: { include: { lines: true } } } }),
      tx.trip.findMany({ where: { vehicleId: plan.vehicleId, releasedAt: null } }),
      tx.operatingDay.findUnique({ where: { date: new Date(plan.date) } }),
      tx.vehicleAvailability.findUnique({ where: { vehicleId_date: { vehicleId: plan.vehicleId, date: new Date(plan.date) } } }),
    ]);
    const keys = [`depot:${plan.depotId}`, ...orders.map(o => `outlet:${o.outletId}`)];
    const [legs, handling] = await Promise.all([
      tx.travelLeg.findMany({ where: { fromKey: { in: keys }, toKey: { in: keys } } }),
      tx.outletHandling.findMany({ where: { outletId: { in: orders.map(o => o.outletId) } } }),
    ]);
    const historicalStops = orders.flatMap(o => o.stops);
    const conflicts = historicalStops.length ? await tx.fieldConflict.findMany({ where: { resolvedAt: null, OR: historicalStops.flatMap(s => [
      { action: { path: ['stopId'], equals: s.id } }, { action: { path: ['request', 'tripId'], equals: s.tripId } }, { action: { path: ['tripId'], equals: s.tripId } },
    ]) } }) : [];
    const legacyConflicts = historicalStops.length ? await tx.syncAction.findMany({ where: { status: 'CONFLICT', entityId: { in: historicalStops.flatMap(s => [s.id, s.tripId]) } } }) : [];
    const conflictedOrderIds = orders.filter(o => o.stops.some(s => legacyConflicts.some(c => c.entityId === s.id || c.entityId === s.tripId) || conflicts.some(c => {
      const a = c.action as { stopId?: string; tripId?: string; request?: { tripId?: string } };
      return a.stopId === s.id || a.tripId === s.tripId || a.request?.tripId === s.tripId;
    }))).map(o => o.id);
    const data = { vehicle, orders, trips, operatingDay, availability, legs, handling, conflictedOrderIds };
    return { result: evaluatePlan(plan, data, replacingTripId), data };
  }
  private assertValid(result: ValidatePlanResponse): asserts result is Extract<ValidatePlanResponse, { valid: true }> {
    if (!result.valid) fail(422, 'PLAN_INVALID', 'Plan violates allocation rules.', result.reasons);
  }
  async validate(input: unknown) {
    const body = object(input), plan = planInput(body.plan);
    let replacing: { tripId: string; expectedPlanVersion: number } | undefined;
    if (body.replacingTrip !== undefined) {
      const r = object(body.replacingTrip);
      replacing = { tripId: text(r.tripId, 'tripId'), expectedPlanVersion: version(r.expectedPlanVersion, 'expectedPlanVersion') };
    }
    return this.db.$transaction(async tx => {
      if (replacing) await this.editableTrip(tx, replacing.tripId, replacing.expectedPlanVersion);
      return (await this.evaluate(tx, plan, replacing?.tripId)).result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async editableTrip(tx: Tx, id: string, expected: number) {
    const trip = await tx.trip.findUnique({ where: { id }, include: tripInclude });
    if (!trip) fail(404, 'NOT_FOUND', 'Trip not found.');
    if (trip.releasedAt || !['CONFIRMED', 'LOADING', 'READY'].includes(trip.status)) fail(409, 'TRIP_STATE_CONFLICT', 'Only an unreleased trip before departure can be changed.');
    if (trip.planVersion !== expected) fail(409, 'STALE_PLAN', 'Plan version changed. Refresh before continuing.');
    return trip;
  }
  private planOf(trip: StoredTrip): PlanInput {
    if (!trip.plannedDeparture) fail(422, 'REFERENCE_DATA_MISSING', 'Trip needs departure time backfill.');
    return planInput({ date: trip.date.toISOString().slice(0, 10), vehicleId: trip.vehicleId, depotId: trip.depotId, plannedDeparture: trip.plannedDeparture, orderIds: trip.stops.filter(s => s.active).map(s => s.orderId) });
  }
  async loadTrip(tx: Tx, id: string) {
    const trip = await tx.trip.findUnique({ where: { id }, include: tripInclude });
    if (!trip) fail(404, 'NOT_FOUND', 'Trip not found.');
    return trip;
  }
  tripView(t: StoredTrip): TripView {
    if (!t.driverId || !t.plannedDepartureAt || !t.plannedReturnAt || t.distanceKm === null || t.stops.some(s => s.sequence > 0 && !s.plannedArrivalAt)) fail(422, 'REFERENCE_DATA_MISSING', 'Legacy trip needs driver, timing and distance backfill.');
    return { id: t.id, version: t.version, planVersion: t.planVersion, vehicleId: t.vehicleId, driverId: t.driverId,
      depotId: t.depotId, date: t.date.toISOString().slice(0, 10), tripNo: t.tripNo as 1 | 2, status: t.status,
      publishedAt: t.publishedAt?.toISOString() ?? null, loaderAcknowledgedPlanVersion: t.loaderAcknowledgedPlanVersion,
      plannedDepartureAt: t.plannedDepartureAt.toISOString(), plannedReturnAt: t.plannedReturnAt.toISOString(),
      totalWeightKg: t.totalWeightKg, totalVolumeM3: t.totalVolumeM3, estimatedDistanceKm: t.distanceKm, reservedFuelL: t.reservedFuelL,
      stops: t.stops.filter(s => s.sequence > 0).map(s => ({ id: s.id, orderId: s.orderId, outletId: s.order.outletId, sequence: s.sequence, status: s.status,
        plannedArrivalAt: s.plannedArrivalAt!.toISOString(), arrivedAt: s.arrivedAt?.toISOString() ?? null,
        reschedule: s.reschedule as TripView['stops'][number]['reschedule'],
        lines: s.lines.map(l => ({ orderLineId: l.orderLineId, version: l.version, plannedQty: l.plannedQty, cancelledQty: l.cancelledQty, loadedQty: l.loadedQty, deliveredQty: l.deliveredQty, returnedQty: l.returnedQty })) })) };
  }
  orderView(o: StoredOrder): OrderView {
    return { id: o.id, version: o.version, outletId: o.outletId, brand: o.outlet.brand, temp: o.temp,
      requestedDate: o.requestedDate.toISOString().slice(0, 10), plannedDate: o.plannedDate?.toISOString().slice(0, 10) ?? null,
      status: o.status, units: o.units, weightKg: o.weightKg, volumeM3: o.volumeM3,
      lines: o.lines.map(l => ({ id: l.id, item: l.item, unit: l.unit, requestedQty: l.requestedQty, cancelledQty: l.cancelledQty, deliveredQty: l.deliveredQty ?? 0 })),
      activeTripId: o.stops.find(s => s.active)?.tripId ?? null, attemptStopIds: o.stops.map(s => s.id), recoveryPending: o.recoveryPending,
      deferralCount: o.deferralCount, deferReason: o.deferReason, deferredToDate: o.deferredToDate?.toISOString().slice(0, 10) ?? null };
  }
  private reservation(plan: PlanInput, result: Extract<ValidatePlanResponse, { valid: true }>, driverId: string, tripNo: number) {
    const departure = localInstant(plan.date, plan.plannedDeparture);
    return { vehicleId: plan.vehicleId, depotId: plan.depotId, date: new Date(plan.date), tripNo, driverId,
      plannedDeparture: plan.plannedDeparture, plannedDepartureAt: departure,
      plannedReturnAt: new Date(departure.getTime() + result.totals.durationMin * 60000),
      totalWeightKg: result.totals.weightKg, totalVolumeM3: result.totals.volumeM3,
      distanceKm: result.totals.distanceKm, reservedFuelL: result.totals.estimatedFuelL, fuelWeekStart: weekStart(plan.date) };
  }
  async allocate(actor: Actor, input: unknown): Promise<AllocatePlanResponse> {
    const body = object(input), id = text(body.draftId, 'draftId'), expected = version(body.expectedDraftVersion, 'expectedDraftVersion');
    return this.mutate(actor, 'ALLOCATE', id, body, async tx => {
      const draft = await tx.planDraft.findUnique({ where: { id } });
      if (!draft) fail(404, 'NOT_FOUND', 'Draft not found.');
      if (draft.version !== expected || draft.allocatedTripId) fail(409, 'DRAFT_CONFLICT', 'Draft changed or was already allocated.');
      const plan = planInput(draft.plan), { result, data } = await this.evaluate(tx, plan);
      this.assertValid(result);
      const sameDay = data.trips.filter(t => t.date.toISOString().slice(0, 10) === plan.date);
      const slot = sameDay.some(t => t.tripNo === 1) ? 2 : 1;
      const trip = await tx.trip.create({ data: { ...this.reservation(plan, result, data.vehicle!.drivers[0].id, slot), status: 'CONFIRMED' } });
      for (const stop of result.stops) {
        const order = data.orders.find(o => o.id === stop.orderId)!;
        const created = await tx.tripStop.create({ data: { tripId: trip.id, orderId: order.id, sequence: stop.sequence,
          plannedArrivalAt: new Date(stop.arrivalAt), lines: { create: nextQuantities(order).filter(l => l.qty > 0).map(l => ({ orderLineId: l.orderLineId, plannedQty: l.qty })) } } });
        await tx.recoveryDecision.updateMany({ where: { retryStopId: null, delivery: { stop: { orderId: order.id } }, decision: { path: ['action'], equals: 'REDELIVER' } }, data: { retryStopId: created.id } });
      }
      await tx.order.updateMany({ where: { id: { in: plan.orderIds } }, data: { status: 'PLANNED', pendingQuantities: Prisma.DbNull, plannedDate: new Date(plan.date), version: { increment: 1 } } });
      await tx.planDraft.update({ where: { id }, data: { allocatedTripId: trip.id, version: { increment: 1 } } });
      await this.audit(tx, actor, 'Trip', trip.id, 'ALLOCATED', { draftId: id, plan, totals: result.totals });
      return { trip: this.tripView(await this.loadTrip(tx, trip.id)) };
    });
  }
  async publish(actor: Actor, input: unknown) {
    const body = object(input);
    if (!Array.isArray(body.trips) || !body.trips.length || body.trips.length > 100) fail(400, 'INVALID_INPUT', 'Select 1 to 100 trips.');
    const selected = body.trips.map(t => { const b = object(t); return { id: text(b.tripId, 'tripId'), expected: version(b.expectedPlanVersion, 'expectedPlanVersion') }; });
    if (new Set(selected.map(t => t.id)).size !== selected.length) fail(400, 'INVALID_INPUT', 'Duplicate trip IDs.');
    return this.mutate(actor, 'PUBLISH', '', body, async tx => {
      const trips: TripView[] = [];
      for (const selectedTrip of selected) {
        const trip = await this.editableTrip(tx, selectedTrip.id, selectedTrip.expected);
        const { result, data } = await this.evaluate(tx, this.planOf(trip), trip.id);
        this.assertValid(result);
        if (data.vehicle!.drivers[0].id !== trip.driverId) fail(409, 'DRIVER_CHANGED', 'Configured driver changed. Amend this plan before publishing.');
        const reservation = this.reservation(this.planOf(trip), result, trip.driverId!, trip.tripNo);
        if (reservation.reservedFuelL !== trip.reservedFuelL || reservation.totalWeightKg !== trip.totalWeightKg ||
            reservation.totalVolumeM3 !== trip.totalVolumeM3 || reservation.distanceKm !== trip.distanceKm ||
            reservation.plannedReturnAt.getTime() !== trip.plannedReturnAt?.getTime() ||
            result.stops.some(s => trip.stops.find(old => old.active && old.orderId === s.orderId)?.plannedArrivalAt?.toISOString() !== s.arrivalAt)) {
          fail(409, 'PLAN_REQUIRES_AMENDMENT', 'Reference data or quantities changed. Amend to reserve the recalculated plan before publishing.');
        }
        if (!trip.publishedAt) {
          await tx.trip.update({ where: { id: trip.id }, data: { publishedAt: new Date(), version: { increment: 1 } } });
          await this.audit(tx, actor, 'Trip', trip.id, 'PUBLISHED', { planVersion: trip.planVersion });
        }
        trips.push(this.tripView(await this.loadTrip(tx, trip.id)));
      }
      return { trips };
    });
  }
  async amend(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion, 'expectedPlanVersion'), plan = planInput(body.plan), reason = text(body.reason, 'reason');
    return this.mutate(actor, 'AMEND', id, body, async tx => {
      const trip = await this.editableTrip(tx, id, expected);
      const activeStops = trip.stops.filter(s => s.active);
      const removed = activeStops.filter(s => !plan.orderIds.includes(s.orderId));
      const vehicleChanged = trip.vehicleId !== plan.vehicleId || trip.depotId !== plan.depotId || trip.date.toISOString().slice(0, 10) !== plan.date;
      if ((vehicleChanged ? activeStops : removed).some(s => s.lines.some(l => (l.loadedQty ?? 0) > 0 || l.pendingUnload))) fail(409, 'UNLOAD_REQUIRED', 'Reconcile/unload affected goods before removing orders or changing vehicle/depot/date.');
      if (activeStops.some(s => s.status !== 'PLANNED' || s.lines.some(l => l.deliveredQty !== null || l.returnedQty !== null))) fail(409, 'PHYSICAL_FACTS_EXIST', 'Plan changes cannot overwrite delivery facts.');
      const { result, data } = await this.evaluate(tx, plan, id);
      this.assertValid(result);
      const otherSlots = data.trips.filter(t => t.id !== id && t.date.toISOString().slice(0, 10) === plan.date).map(t => t.tripNo);
      const slot = otherSlots.includes(1) ? 2 : 1;
      // Archive/temporary positions are below every prior archived sequence, so repeated amendments remain unique.
      const archiveBase = Math.min(0, ...trip.stops.map(s => s.sequence)) - 1;
      for (let i = 0; i < activeStops.length; i++) await tx.tripStop.update({ where: { id: activeStops[i].id }, data: { sequence: archiveBase - i } });
      for (const s of removed) {
        // Archive the removed attempt under a unique negative sequence; preserve all line facts.
        await tx.tripStop.update({ where: { id: s.id }, data: { active: false, status: 'RESCHEDULED' } });
        await tx.order.update({ where: { id: s.orderId }, data: { status: 'CONFIRMED', pendingQuantities: json(remainingLines(s.lines)), plannedDate: null, version: { increment: 1 } } });
      }
      for (const stop of result.stops) {
        const existing = trip.stops.find(s => s.active && s.orderId === stop.orderId);
        if (existing) await tx.tripStop.update({ where: { id: existing.id }, data: { sequence: stop.sequence, plannedArrivalAt: new Date(stop.arrivalAt) } });
        else {
          const order = data.orders.find(o => o.id === stop.orderId)!;
          const added = await tx.tripStop.create({ data: { tripId: id, orderId: stop.orderId, sequence: stop.sequence, plannedArrivalAt: new Date(stop.arrivalAt), lines: { create: nextQuantities(order).filter(l => l.qty > 0).map(l => ({ orderLineId: l.orderLineId, plannedQty: l.qty })) } } });
          await tx.recoveryDecision.updateMany({ where: { retryStopId: null, delivery: { stop: { orderId: order.id } }, decision: { path: ['action'], equals: 'REDELIVER' } }, data: { retryStopId: added.id } });
        }
      }
      await tx.order.updateMany({ where: { id: { in: plan.orderIds } }, data: { status: 'PLANNED', pendingQuantities: Prisma.DbNull, plannedDate: new Date(plan.date), version: { increment: 1 } } });
      await tx.trip.update({ where: { id }, data: { ...this.reservation(plan, result, data.vehicle!.drivers[0].id, slot), status: 'CONFIRMED', version: { increment: 1 }, planVersion: { increment: 1 }, loaderAcknowledgedPlanVersion: null } });
      await tx.loadingRecord.updateMany({ where: { tripId: id }, data: { status: 'IN_PROGRESS', completedAt: null } });
      await this.audit(tx, actor, 'Trip', id, 'AMENDED', { beforePlan: this.planOf(trip), afterPlan: plan, previousPlanVersion: expected }, reason);
      return this.tripView(await this.loadTrip(tx, id));
    });
  }
  async release(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion, 'expectedPlanVersion'), reason = text(body.reason, 'reason');
    return this.mutate(actor, 'RELEASE', id, body, async tx => {
      const trip = await this.editableTrip(tx, id, expected);
      if (trip.stops.filter(s => s.active).some(s => s.lines.some(l => (l.loadedQty ?? 0) > 0 || l.pendingUnload || l.deliveredQty !== null || l.returnedQty !== null))) fail(409, 'UNLOAD_REQUIRED', 'Unloaded/reconciled goods are required before release.');
      const ids = trip.stops.filter(s => s.active).map(s => s.orderId), releasedAt = new Date();
      await tx.tripStop.updateMany({ where: { tripId: id, active: true }, data: { active: false, status: 'RESCHEDULED' } });
      await tx.trip.update({ where: { id }, data: { releasedAt, reservedFuelL: 0, loaderAcknowledgedPlanVersion: null, version: { increment: 1 }, planVersion: { increment: 1 } } });
      for (const stop of trip.stops.filter(s => s.active)) await tx.order.update({ where: { id: stop.orderId }, data: { status: 'CONFIRMED', pendingQuantities: json(remainingLines(stop.lines)), plannedDate: null, version: { increment: 1 } } });
      await this.audit(tx, actor, 'Trip', id, 'RELEASED', { orderIds: ids }, reason);
      const orders = await tx.order.findMany({ where: { id: { in: ids } }, include: orderInclude });
      return { tripId: id, releasedAt: releasedAt.toISOString(), orders: orders.map(o => this.orderView(o)) };
    });
  }
  private scope(actor: Actor, trip: StoredTrip) {
    if (actor.role === 'DISPATCHER') return;
    if (actor.role === 'LOADER' && actor.depotId === trip.depotId && trip.publishedAt && !trip.releasedAt) return;
    if (actor.role === 'DRIVER' && actor.id === trip.driverId && actor.vehicleId === trip.vehicleId && trip.publishedAt && !trip.releasedAt && ['READY', 'IN_TRANSIT', 'COMPLETED', 'COMPLETED_WITH_EXCEPTIONS'].includes(trip.status)) return;
    fail(403, 'FORBIDDEN', 'Trip is not visible to this account.');
  }
  async getTrip(actor: Actor, id: string) {
    const trip = await this.loadTrip(this.db, id); this.scope(actor, trip); return this.tripView(trip);
  }
  async listTrips(actor: Actor, query: Record<string, unknown>) {
    const limit = query.limit === undefined ? 50 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail(400, 'INVALID_INPUT', 'limit must be 1 to 100.');
    const where: Prisma.TripWhereInput = { releasedAt: null };
    if (query.date !== undefined) where.date = new Date(date(query.date));
    if (query.depotId !== undefined) where.depotId = text(query.depotId, 'depotId');
    if (actor.role === 'LOADER') { if (!actor.depotId) fail(403, 'FORBIDDEN', 'Loader has no depot.'); where.depotId = actor.depotId; where.publishedAt = { not: null }; }
    else if (actor.role === 'DRIVER') { if (!actor.vehicleId) fail(403, 'FORBIDDEN', 'Driver has no vehicle.'); where.driverId = actor.id; where.vehicleId = actor.vehicleId; where.publishedAt = { not: null }; where.status = { in: ['READY', 'IN_TRANSIT', 'COMPLETED', 'COMPLETED_WITH_EXCEPTIONS'] }; }
    else if (actor.role !== 'DISPATCHER') fail(403, 'FORBIDDEN', 'Role cannot list trips.');
    if (query.cursor !== undefined) where.id = { gt: text(query.cursor, 'cursor') };
    const trips = await this.db.trip.findMany({ where, include: tripInclude, orderBy: { id: 'asc' }, take: limit + 1 });
    return { items: trips.slice(0, limit).map(t => this.tripView(t)), nextCursor: trips.length > limit ? trips[limit - 1].id : null };
  }
  async acknowledge(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion, 'expectedPlanVersion');
    return this.mutate(actor, 'ACKNOWLEDGE_PLAN', id, body, async tx => {
      const trip = await this.editableTrip(tx, id, expected); this.scope(actor, trip);
      if (actor.role !== 'LOADER' || !trip.publishedAt) fail(403, 'FORBIDDEN', 'Only the depot Loader can acknowledge a published plan.');
      await tx.trip.update({ where: { id }, data: { loaderAcknowledgedPlanVersion: expected, version: { increment: 1 } } });
      await this.audit(tx, actor, 'Trip', id, 'PLAN_ACKNOWLEDGED', { planVersion: expected });
      return this.tripView(await this.loadTrip(tx, id));
    });
  }
  async vehicleAvailable(tx: Tx, trip: { vehicleId: string; date: Date }) {
    const [vehicle, daily] = await Promise.all([
      tx.vehicle.findUnique({where: {id: trip.vehicleId}}),
      tx.vehicleAvailability.findUnique({where: {vehicleId_date: {vehicleId: trip.vehicleId, date: trip.date}}}),
    ]);
    return !!vehicle?.available && daily?.available !== false;
  }
  async requireVehicleAvailable(tx: Tx, trip: { vehicleId: string; date: Date }) {
    if (!await this.vehicleAvailable(tx, trip)) fail(409, 'VEHICLE_UNAVAILABLE', 'Vehicle unavailable. Stop loading and ask Dispatcher to assign a suitable replacement. Unloading is still allowed.');
  }
  async reportVehicleUnavailable(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion, 'expectedPlanVersion'), reason = text(body.reason, 'reason');
    return this.mutate(actor, 'VEHICLE_UNAVAILABLE', id, body, async tx => {
      const trip = await this.editableTrip(tx, id, expected);
      if (actor.role !== 'DISPATCHER' && (actor.role !== 'LOADER' || actor.depotId !== trip.depotId || !trip.publishedAt)) fail(403, 'FORBIDDEN', 'Only Dispatcher or the assigned-depot Loader can report this vehicle.');
      await tx.vehicleAvailability.upsert({where: {vehicleId_date: {vehicleId: trip.vehicleId, date: trip.date}}, create: {vehicleId: trip.vehicleId, date: trip.date, available: false}, update: {available: false}});
      // Every pre-departure trip using this vehicle on this day must be rechecked.
      const affected = await tx.trip.findMany({where: {vehicleId: trip.vehicleId, date: trip.date, releasedAt: null, status: {in: ['CONFIRMED', 'LOADING', 'READY']}}});
      for (const t of affected) {
        await tx.trip.update({where: {id: t.id}, data: {status: t.status === 'READY' ? 'LOADING' : t.status, loaderAcknowledgedPlanVersion: null, version: {increment: 1}}});
        await tx.loadingRecord.updateMany({where: {tripId: t.id}, data: {status: 'IN_PROGRESS', completedAt: null}});
        if(t.status === 'READY') await tx.order.updateMany({where: {stops: {some: {tripId: t.id, active: true}}}, data: {status: 'LOADING', version: {increment: 1}}});
        await this.audit(tx, actor, 'Trip', t.id, 'VEHICLE_UNAVAILABLE', {vehicleId: trip.vehicleId, date: trip.date.toISOString(), reportedTripId: id}, reason);
      }
      return this.tripView(await this.loadTrip(tx, id));
    });
  }
  async ready(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion, 'expectedPlanVersion');
    return this.mutate(actor, 'READY', id, body, async tx => {
      const trip = await this.editableTrip(tx, id, expected); this.scope(actor, trip);
      if (actor.role !== 'LOADER' || !trip.publishedAt) fail(403, 'FORBIDDEN', 'Only the depot Loader can ready a published plan.');
      await this.requireVehicleAvailable(tx, trip);
      if (trip.loaderAcknowledgedPlanVersion !== trip.planVersion) fail(409, 'PLAN_ACKNOWLEDGEMENT_REQUIRED', 'Acknowledge the current plan before confirming readiness.');
      const record = await tx.loadingRecord.findUnique({ where: { tripId: id }, include: { issues: true } });
      const stops = trip.stops.filter(s => s.active);
      if (!record?.startedAt || record.issues.some(i => i.status !== 'RESOLVED') || !stops.length ||
          stops.some(s => !s.lines.length || s.lines.some(l => l.pendingUnload || l.loadedQty === null || l.loadedQty !== l.plannedQty - l.cancelledQty) || s.lines.every(l => l.loadedQty === 0))) {
        fail(409, 'LOADING_INCOMPLETE', 'Check all current lines, resolve/acknowledge issues and reconcile unloaded goods before READY.');
      }
      await tx.trip.update({ where: { id }, data: { status: 'READY', version: { increment: 1 } } });
      await tx.order.updateMany({ where: { id: { in: stops.map(s => s.orderId) } }, data: { status: 'READY', version: { increment: 1 } } });
      await tx.loadingRecord.update({ where: { id: record.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await this.audit(tx, actor, 'Trip', id, 'READY', { planVersion: expected });
      return this.tripView(await this.loadTrip(tx, id));
    });
  }

}
