import { Injectable } from '@nestjs/common';
import type { DeferralView, LoadingDecision, LoadingIssueView, RecoveryDecision, RecoveryView, TripView } from '@waypoint/contracts';
import { Prisma, type LoadingIssue, type OrderDeferral } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Actor } from '../auth/auth.service';
import { fail } from '../common/api-error';
import { PlanningService, orderInclude, json } from './planning.service';
import { date, object, text, version } from './planning.input';
import { quantities, quantityTotals, remainingLines, type PlannedQuantity } from './quantity-plan';
import { recoveryBalance, recoveryInclude } from './recovery-balance';
type Tx = Prisma.TransactionClient;
function qty(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 2147483647) fail(400, 'INVALID_INPUT', 'Quantity must be an integer between 0 and 2147483647.');
  return value as number;
}
function inputLines(value: unknown, key: 'qty' | 'returnedQty'): PlannedQuantity[] {
  if (!Array.isArray(value) || !value.length || value.length > 1000) fail(400, 'INVALID_INPUT', 'Supply 1 to 1000 lines.');
  const lines = value.map(v => { const line = object(v); return { orderLineId: text(line.orderLineId, 'orderLineId'), qty: qty(line[key]) }; });
  if (new Set(lines.map(l => l.orderLineId)).size !== lines.length) fail(400, 'INVALID_INPUT', 'Line IDs must be unique.');
  return lines;
}
@Injectable()
export class DecisionsService {
  constructor(private readonly db: PrismaService, private readonly planning: PlanningService) {}
  private loader(actor: Actor, trip: { depotId: string; publishedAt: Date | null }) {
    if (actor.role !== 'LOADER' || actor.depotId !== trip.depotId || !trip.publishedAt) fail(403, 'FORBIDDEN', 'Only the assigned-depot Loader can change a published load.');
  }
  private issueView(issue: LoadingIssue, trip: { id: string; planVersion: number }): LoadingIssueView {
    return { id: issue.id, version: issue.version, tripId: trip.id, planVersion: trip.planVersion, orderLineId: issue.orderLineId,
      note: issue.note, photoRefs: issue.photoRefs, type: issue.type, expectedQty: issue.expectedQty, availableQty: issue.availableQty, status: issue.status,
      decision: issue.decisionData as LoadingDecision | null, decidedById: issue.decidedById, decidedAt: issue.decidedAt?.toISOString() ?? null,
      acknowledgedById: issue.acknowledgedById, acknowledgedAt: issue.acknowledgedAt?.toISOString() ?? null, cancelledQty: issue.cancelledQty };
  }
  private async loadingView(tx: Tx, tripId: string) {
    const trip = await this.planning.loadTrip(tx, tripId);
    const record = await tx.loadingRecord.findUnique({ where: { tripId }, include: { issues: true } });
    return { trip: this.planning.tripView(trip), issues: (record?.issues ?? []).map(i => this.issueView(i, trip)) };
  }
  async getLoading(actor: Actor, id: string) {
    return this.db.$transaction(async tx => {
      const trip = await this.planning.loadTrip(tx, id);
      if (actor.role !== 'DISPATCHER') this.loader(actor, trip);
      if (trip.releasedAt) fail(409, 'TRIP_RELEASED', 'Trip was released.');
      return this.loadingView(tx, id);
    });
  }
  async startLoading(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion);
    return this.planning.mutate(actor, 'START_LOADING', id, body, async tx => {
      const trip = await this.planning.editableTrip(tx, id, expected); this.loader(actor, trip);
      const existing = await tx.loadingRecord.findUnique({ where: { tripId: id } });
      await tx.loadingRecord.upsert({ where: { tripId: id }, create: { tripId: id, checkedById: actor.id, startedAt: new Date(), status: 'IN_PROGRESS' }, update: { checkedById: actor.id, startedAt: existing?.startedAt ?? new Date(), status: 'IN_PROGRESS', completedAt: null } });
      await this.invalidateReady(tx, id, false);
      await this.planning.audit(tx, actor, 'Trip', id, 'LOADING_STARTED', { planVersion: expected });
      return this.loadingView(tx, id);
    });
  }
  private async invalidateReady(tx: Tx, id: string, planChanged: boolean) {
    await tx.trip.update({ where: { id }, data: { status: 'LOADING', version: { increment: 1 }, ...(planChanged ? { planVersion: { increment: 1 }, loaderAcknowledgedPlanVersion: null } : {}) } });
    await tx.order.updateMany({ where: { stops: { some: { tripId: id, active: true } } }, data: { status: 'LOADING', version: { increment: 1 } } });
    await tx.loadingRecord.updateMany({ where: { tripId: id }, data: { status: 'IN_PROGRESS', completedAt: null } });
  }
  async loadLine(actor: Actor, id: string, lineId: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion), lineVersion = version(body.expectedVersion), loadedQty = qty(body.loadedQty);
    return this.planning.mutate(actor, 'LOAD_LINE', `${id}:${lineId}`, body, async tx => {
      const trip = await this.planning.editableTrip(tx, id, expected); this.loader(actor, trip);
      const line = trip.stops.filter(s => s.active).flatMap(s => s.lines).find(l => l.orderLineId === lineId);
      if (!line) fail(404, 'NOT_FOUND', 'Line is not assigned to this trip.');
      if (!await tx.loadingRecord.findUnique({ where: { tripId: id } })) fail(409, 'LOADING_NOT_STARTED', 'Start loading first.');
      if (line.version !== lineVersion) fail(409, 'STALE_LINE', 'Line version changed.');
      if (loadedQty > line.plannedQty - line.cancelledQty) fail(422, 'QUANTITY_EXCEEDED', 'Loaded quantity exceeds the approved attempt quantity.');
      await tx.tripStopLine.update({ where: { id: line.id }, data: { loadedQty, pendingUnload: false, version: { increment: 1 } } });
      await this.invalidateReady(tx, id, false);
      await this.planning.audit(tx, actor, 'TripStopLine', line.id, 'LOAD_CHECKED', { previousLoadedQty: line.loadedQty, loadedQty });
      return this.loadingView(tx, id);
    });
  }
  async reportIssue(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion), lineId = text(body.orderLineId, 'orderLineId'), availableQty = qty(body.availableQty), note = text(body.note, 'note');
    if (body.type !== 'MISSING' && body.type !== 'DAMAGED') fail(400, 'INVALID_INPUT', 'Invalid loading issue type.');
    const type = body.type;
    if (!Array.isArray(body.photoRefs) || body.photoRefs.length > 20) fail(400, 'INVALID_INPUT', 'photoRefs must be an array of at most 20 durable references.');
    const photoRefs = body.photoRefs.map(p => text(p, 'photoRefs'));
    if (photoRefs.some(p => /^(blob:|data:)/i.test(p))) fail(400, 'INVALID_INPUT', 'Browser preview URLs are not durable evidence references.');
    return this.planning.mutate(actor, 'REPORT_LOADING_ISSUE', id, body, async tx => {
      const trip = await this.planning.editableTrip(tx, id, expected); this.loader(actor, trip);
      const stop = trip.stops.find(s => s.active && s.lines.some(l => l.orderLineId === lineId));
      const line = stop?.lines.find(l => l.orderLineId === lineId);
      if (!stop || !line) fail(404, 'NOT_FOUND', 'Line is not assigned to this trip.');
      const evidence = await tx.evidence.count({where:{id:{in:[...new Set(photoRefs)]},ownerId:actor.id,orderId:stop.orderId}});
      if(evidence !== new Set(photoRefs).size) fail(403,'INVALID_EVIDENCE_SCOPE','Loading evidence is missing or outside this account/order.');
      const record = await tx.loadingRecord.findUnique({ where: { tripId: id } });
      if (!record) fail(409, 'LOADING_NOT_STARTED', 'Start loading first.');
      if (availableQty >= line.plannedQty - line.cancelledQty) fail(422, 'NO_SHORTFALL', 'Available quantity must be below the approved quantity.');
      if (await tx.loadingIssue.findFirst({ where: { loadingRecordId: record.id, orderLineId: lineId, status: { not: 'RESOLVED' } } })) fail(409, 'ISSUE_ALREADY_OPEN', 'Resolve the existing issue for this line first.');
      const issue = await tx.loadingIssue.create({ data: { loadingRecordId: record.id, stopId: stop.id, reportedPlanVersion: expected, orderLineId: lineId, type, availableQty, expectedQty: line.plannedQty - line.cancelledQty, note, photoRefs } });
      await this.invalidateReady(tx, id, false);
      await this.planning.audit(tx, actor, 'LoadingIssue', issue.id, 'REPORTED', { availableQty, expectedQty: issue.expectedQty });
      return this.issueView(issue, trip);
    });
  }
  private async issueContext(tx: Tx, id: string, expected: number, issueVersion: number) {
    const issue = await tx.loadingIssue.findUnique({ where: { id }, include: { loadingRecord: true } });
    if (!issue) fail(404, 'NOT_FOUND', 'Loading issue not found.');
    const trip = await this.planning.editableTrip(tx, issue.loadingRecord.tripId, expected);
    if (issue.version !== issueVersion) fail(409, 'STALE_ISSUE', 'Issue version changed.');
    const stop = trip.stops.find(s => s.active && s.id === issue.stopId);
    const line = stop?.lines.find(l => l.orderLineId === issue.orderLineId);
    if (!stop || !line) fail(409, 'ISSUE_ATTEMPT_CHANGED', 'Issue does not belong to the current active attempt.');
    return { issue, trip, stop, line };
  }
  async decideShortfall(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion), issueVersion = version(body.expectedVersion), d = object(body.decision), reason = text(d.reason, 'reason');
    let decision: LoadingDecision;
    if (d.action === 'REPLACEMENT_REQUIRED') decision = { action: d.action, reason };
    else if (d.action === 'SHIP_SHORT') decision = { action: d.action, reason, approvedLoadedQty: qty(d.approvedLoadedQty) };
    else fail(400, 'INVALID_INPUT', 'Unknown loading decision.');
    return this.planning.mutate(actor, 'DECIDE_SHORTFALL', id, body, async tx => {
      const { issue, trip, stop, line } = await this.issueContext(tx, id, expected, issueVersion);
      if (issue.status !== 'OPEN' || issue.cancelledQty > 0) fail(409, 'ISSUE_ALREADY_DECIDED', 'This issue already has a terminal decision.');
      let cancelledQty = 0;
      if (decision.action === 'SHIP_SHORT') {
        if (decision.approvedLoadedQty > issue.availableQty || decision.approvedLoadedQty >= line.plannedQty - line.cancelledQty) fail(422, 'INVALID_SHORTFALL', 'Approved load must be within reported availability and below the outstanding planned quantity.');
        if ((line.loadedQty ?? 0) > decision.approvedLoadedQty) fail(409, 'UNLOAD_REQUIRED', 'Check/unload the excess goods before approving this quantity.');
        const remaining = remainingLines(stop.lines).map(l => l.orderLineId === line.orderLineId ? { ...l, qty: decision.approvedLoadedQty } : l).filter(l => l.qty > 0);
        if (!remaining.length) fail(422, 'ZERO_LOAD_REQUIRES_DEFERRAL', 'Do not cancel an entire zero-load order; unload, release/amend and defer it.');
        const order = await tx.order.findUniqueOrThrow({ where: { id: stop.orderId }, include: { lines: true } });
        quantityTotals(order, remaining);
        cancelledQty = line.plannedQty - line.cancelledQty - decision.approvedLoadedQty;
        await tx.quantityCancellation.create({ data: { orderLineId: line.orderLineId, loadingIssueId: id, qty: cancelledQty, reason, actorId: actor.id } });
        await tx.orderLine.update({ where: { id: line.orderLineId }, data: { cancelledQty: { increment: cancelledQty } } });
        await tx.tripStopLine.update({ where: { id: line.id }, data: { cancelledQty: { increment: cancelledQty }, version: { increment: 1 } } });
        const revised = await this.planning.loadTrip(tx, trip.id);
        const orders = await tx.order.findMany({ where: { id: { in: revised.stops.filter(s => s.active).map(s => s.orderId) } }, include: { lines: true } });
        let totalWeightKg = 0, totalVolumeM3 = 0;
        for (const s of revised.stops.filter(s => s.active)) {
          const totals = quantityTotals(orders.find(o => o.id === s.orderId)!, remainingLines(s.lines));
          totalWeightKg += totals.weightKg; totalVolumeM3 += totals.volumeM3;
        }
        await tx.trip.update({ where: { id: trip.id }, data: { totalWeightKg, totalVolumeM3 } });
        await this.invalidateReady(tx, trip.id, true);
      }
      const updated = await tx.loadingIssue.update({ where: { id }, data: { decisionData: json(decision), decidedById: actor.id, decidedAt: new Date(), cancelledQty, version: { increment: 1 }, status: decision.action === 'SHIP_SHORT' ? 'SHIP_SHORT' : 'OPEN' } });
      await this.planning.audit(tx, actor, 'LoadingIssue', id, 'DECIDED', { decision, cancelledQty, previousPlanVersion: expected }, reason);
      return this.issueView(updated, { id: trip.id, planVersion: expected + (cancelledQty > 0 ? 1 : 0) });
    });
  }
  async acknowledgeIssue(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion), issueVersion = version(body.expectedVersion);
    return this.planning.mutate(actor, 'ACKNOWLEDGE_LOADING_ISSUE', id, body, async tx => {
      const { issue, trip, line } = await this.issueContext(tx, id, expected, issueVersion); this.loader(actor, trip);
      if (!issue.decisionData || issue.status === 'RESOLVED') fail(409, 'ISSUE_STATE_CONFLICT', 'A current unresolved Dispatcher decision is required.');
      if (line.loadedQty !== line.plannedQty - line.cancelledQty || line.pendingUnload) fail(409, 'LOAD_NOT_CONFIRMED', 'Check the replacement/approved short load before acknowledging.');
      const updated = await tx.loadingIssue.update({ where: { id }, data: { status: 'RESOLVED', acknowledgedAt: new Date(), acknowledgedById: actor.id, version: { increment: 1 } } });
      await this.planning.audit(tx, actor, 'LoadingIssue', id, 'ACKNOWLEDGED', { planVersion: expected });
      return this.issueView(updated, trip);
    });
  }
  private deferralView(d: OrderDeferral): DeferralView {
    return { id: d.id, orderId: d.orderId, fromDate: d.fromDate?.toISOString().slice(0, 10) ?? null, toDate: d.toDate.toISOString().slice(0, 10), reason: d.reason, actorId: d.actorId, recordedAt: d.recordedAt.toISOString() };
  }
  private async futureRun(tx: Tx, day: string, previous: Date, orderId: string) {
    if (day <= previous.toISOString().slice(0, 10)) fail(422, 'INVALID_NEXT_DATE', 'Choose a date later than the current run.');
    const calendar = await tx.operatingDay.findUnique({ where: { date: new Date(day) } });
    if (!calendar) fail(422, 'REFERENCE_DATA_MISSING', 'Operating calendar entry is missing.');
    if (!calendar.operating || new Date(day).getUTCDay()===0) fail(422, 'NON_OPERATING_DATE', 'The selected date is not operating.');
    const {outlet}=await tx.order.findUniqueOrThrow({where:{id:orderId},include:{outlet:true}});
    if(outlet.brand==='STYLE'&&(!outlet.scheduledWeekday||new Date(day).getUTCDay()!==outlet.scheduledWeekday))fail(422,'INVALID_NEXT_DATE','Choose this Style outlet’s configured weekly delivery day.');
  }
  async defer(actor: Actor, input: unknown) {
    const body = object(input), id = text(body.orderId, 'orderId'), expected = version(body.expectedVersion), nextDate = date(body.nextDate), reason = text(body.reason, 'reason');
    return this.planning.mutate(actor, 'DEFER_ORDER', id, body, async tx => {
      const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
      if (!order) fail(404, 'NOT_FOUND', 'Order not found.');
      if (order.version !== expected) fail(409, 'STALE_ORDER', 'Order version changed.');
      if (!['CONFIRMED', 'DEFERRED'].includes(order.status) || order.stops.some(s => s.active)) fail(409, 'ORDER_ASSIGNED', 'Safely release/amend the allocation first; an in-transit stop requires rescheduling.');
      const from = order.deferredToDate ?? order.plannedDate ?? order.requestedDate;
      await this.futureRun(tx, nextDate, from, id);
      const deferral = await tx.orderDeferral.create({ data: { orderId: id, fromDate: from, toDate: new Date(nextDate), reason, actorId: actor.id } });
      const updated = await tx.order.update({ where: { id }, data: { status: 'DEFERRED', plannedDate: new Date(nextDate), deferredToDate: new Date(nextDate), deferReason: reason, deferralCount: { increment: 1 }, version: { increment: 1 } }, include: orderInclude });
      await this.planning.audit(tx, actor, 'Order', id, 'DEFERRED', this.deferralView(deferral), reason);
      return { order: this.planning.orderView(updated), deferral: this.deferralView(deferral) };
    });
  }
  async deferrals(actor: Actor, id: string, query: Record<string, unknown>) {
    const order = await this.db.order.findUnique({ where: { id } });
    if (!order) fail(404, 'NOT_FOUND', 'Order not found.');
    if (actor.role !== 'DISPATCHER' && !(actor.role === 'STORE_MANAGER' && actor.outletId === order.outletId)) fail(403, 'FORBIDDEN', 'Deferral history is scoped to the order outlet.');
    const limit = query.limit === undefined ? 50 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail(400, 'INVALID_INPUT', 'limit must be 1 to 100.');
    const records = await this.db.orderDeferral.findMany({ where: { orderId: id, ...(query.cursor === undefined ? {} : { id: { gt: text(query.cursor, 'cursor') } }) }, orderBy: { id: 'asc' }, take: limit + 1 });
    return { items: records.slice(0, limit).map(d => this.deferralView(d)), nextCursor: records.length > limit ? records[limit - 1].id : null };
  }
  private async noConflicts(tx: Tx, tripId: string, stopId: string) {
    const conflict = await tx.fieldConflict.findFirst({ where: { resolvedAt: null, OR: [{ action: { path: ['stopId'], equals: stopId } }, { action: { path: ['request', 'tripId'], equals: tripId } }, { action: { path: ['tripId'], equals: tripId } }] } });
    const legacy = await tx.syncAction.findFirst({ where: { status: 'CONFLICT', entityId: { in: [tripId, stopId] } } });
    if (conflict || legacy) fail(409, 'UNRESOLVED_FIELD_CONFLICT', 'Reconcile preserved field facts before changing this attempt balance.');
  }
  async recoveryState(id:string){
    const delivery=await this.db.delivery.findUnique({where:{id},include:recoveryInclude});
    if(!delivery)fail(404,'NOT_FOUND','Delivery not found.');
    return {deliveryId:id,version:delivery.version,lines:recoveryBalance(delivery),decisions:delivery.recoveryDecisions.map(r=>({id:r.id,sourceDeliveryId:id,decision:r.decision,decidedById:r.decidedById,decidedAt:r.decidedAt.toISOString(),retryStopId:r.retryStopId}))};
  }
  async recover(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedVersion), d = object(body.decision), reason = text(d.reason, 'reason'), lines = inputLines(d.lines, 'qty');
    if (lines.some(l => l.qty === 0)) fail(400, 'INVALID_INPUT', 'Recovery quantities must be positive.');
    let decision: RecoveryDecision;
    if (d.action === 'REDELIVER') decision = { action: d.action, reason, lines: lines as RecoveryDecision['lines'], nextDate: date(d.nextDate) };
    else if (d.action === 'CLOSE_WITHOUT_REDELIVERY') decision = { action: d.action, reason, lines: lines as RecoveryDecision['lines'] };
    else fail(400, 'INVALID_INPUT', 'Unknown recovery action.');
    return this.planning.mutate(actor, 'RECOVERY_DECISION', id, body, async tx => {
      const delivery = await tx.delivery.findUnique({ where: { id }, include: recoveryInclude });
      if (!delivery) fail(404, 'NOT_FOUND', 'Delivery not found.');
      if (delivery.version !== expected) fail(409, 'STALE_DELIVERY', 'Delivery version changed; refresh before deciding recovery.');
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: delivery.stop.tripId } });
      if (!['IN_TRANSIT', 'COMPLETED', 'COMPLETED_WITH_EXCEPTIONS'].includes(trip.status) || (!['DELIVERED', 'PARTIAL', 'FAILED'].includes(delivery.stop.status) || delivery.stop.status !== delivery.outcome)) fail(409, 'DELIVERY_NOT_TERMINAL', 'Recovery requires a recorded terminal delivery attempt.');
      await this.noConflicts(tx, trip.id, delivery.stopId);
      const order = await tx.order.findUniqueOrThrow({ where: { id: delivery.stop.orderId }, include: { lines: true, stops: true } });
      if (order.stops.some(s => s.active && s.id !== delivery.stopId)) fail(409, 'ORDER_ASSIGNED', 'Reconcile the current active attempt before another recovery decision.');
      const available = recoveryBalance(delivery);
      if (lines.some(l => l.qty > (available.find(a => a.orderLineId === l.orderLineId)?.qty ?? 0))) fail(422, 'RECOVERY_QUANTITY_EXCEEDED', 'Recovery cannot exceed this attempt’s undecided returns/receipt discrepancies. Warehouse cancellations are excluded.');
      let pending = order.pendingQuantities === null ? [] : quantities(order.pendingQuantities);
      if (decision.action === 'REDELIVER') {
        await this.futureRun(tx, decision.nextDate, trip.date, order.id);
        if (pending.length && order.deferredToDate?.toISOString().slice(0, 10) !== decision.nextDate) fail(409, 'RETRY_DATE_CONFLICT', 'Use the same date as the already authorized pending retry, or defer that order first.');
        const totals = new Map(pending.map(l => [l.orderLineId, l.qty]));
        for (const l of lines) totals.set(l.orderLineId, (totals.get(l.orderLineId) ?? 0) + l.qty);
        pending = [...totals].map(([orderLineId, qty]) => ({ orderLineId, qty }));
        quantityTotals(order, pending);
      }
      const record = await tx.recoveryDecision.create({ data: { sourceDeliveryId: id, decision: json(decision), decidedById: actor.id } });
      await tx.delivery.update({ where: { id }, data: { version: { increment: 1 } } });
      await tx.tripStop.update({ where: { id: delivery.stopId }, data: { active: false } });
      await tx.order.update({ where: { id: order.id }, data: { pendingQuantities: json(pending), ...(decision.action === 'REDELIVER' ? { status: 'DEFERRED', plannedDate: new Date(decision.nextDate), deferredToDate: new Date(decision.nextDate) } : {}), version: { increment: 1 } } });
      await this.reconcileOrder(tx, order.id);
      await this.planning.audit(tx, actor, 'Delivery', id, 'RECOVERY_DECIDED', { recoveryId: record.id, decision, previousDeliveryVersion: expected, receiptId: delivery.receipt?.id ?? null }, reason);
      const view: RecoveryView = { sourceDeliveryVersion: expected + 1, id: record.id, sourceDeliveryId: id, decision, decidedById: actor.id, decidedAt: record.decidedAt.toISOString(), retryStopId: null };
      return view;
    });
  }
  /** Also call inside future Delivery/Receipt transactions, after writing their immutable attempt facts. */
  async reconcileOrder(tx: Tx, orderId: string) {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { stops: true } });
    const deliveries = await tx.delivery.findMany({ where: { stop: { orderId } }, include: recoveryInclude });
    const pending = order.pendingQuantities === null ? [] : quantities(order.pendingQuantities);
    const unresolved = deliveries.some(d => recoveryBalance(d).some(l => l.qty > 0));
    const awaitingReceipt = deliveries.some(d => d.stop.lines.some(l => (l.deliveredQty ?? 0) > 0) && (!d.receipt || d.receipt.status === 'PENDING'));
    const conflictFilters = order.stops.flatMap(s => [{action:{path:['stopId'],equals:s.id}}, {action:{path:['request','tripId'],equals:s.tripId}}]);
    const fieldReview = conflictFilters.length ? await tx.fieldConflict.findFirst({where:{resolvedAt:null,OR:conflictFilters}}) : null;
    const review = deliveries.some(d => d.requiresDispatcherReview) || !!fieldReview;
    const active = order.stops.some(s => s.active);
    const recoveryPending = unresolved || pending.some(l => l.qty > 0);
    const anyHandover = deliveries.some(d => d.stop.lines.some(l => (l.deliveredQty ?? 0) > 0));
    const status = active ? order.status : pending.some(l => l.qty > 0) ? 'DEFERRED' : unresolved || awaitingReceipt || review ? (anyHandover ? 'DELIVERED' : 'DEFERRED') : deliveries.length ? 'RECEIVED' : order.status;
    if (order.recoveryPending !== recoveryPending || order.status !== status) await tx.order.update({ where: { id: orderId }, data: { recoveryPending, status, version: { increment: 1 } } });
  }
  async reschedule(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion), nextDate = date(body.nextDate), reason = text(body.reason, 'reason');
    return this.planning.mutate(actor, 'RESCHEDULE_STOP', id, body, async tx => {
      const stop = await tx.tripStop.findUnique({ where: { id }, include: { trip: true, lines: true, delivery: true } });
      if (!stop) fail(404, 'NOT_FOUND', 'Stop not found.');
      const trip = stop.trip;
      if (trip.planVersion !== expected) fail(409, 'STALE_PLAN', 'Plan version changed.');
      if (trip.releasedAt || trip.status !== 'IN_TRANSIT' || !stop.active || !['PLANNED', 'ARRIVED'].includes(stop.status) || stop.delivery || stop.lines.some(l => l.deliveredQty !== null || l.returnedQty !== null)) fail(409, 'STOP_STATE_CONFLICT', 'Only a nonterminal in-transit stop can be rescheduled; actual handovers use recovery.');
      if (stop.reschedule) fail(409, 'RESCHEDULE_PENDING', 'A reschedule request already exists for this attempt.');
      await this.noConflicts(tx, trip.id, id);
      await this.futureRun(tx, nextDate, trip.date, stop.orderId);
      const intent: NonNullable<TripView['stops'][number]['reschedule']> = { nextDate, reason, requestedAt: new Date().toISOString(), requestedById: actor.id, acknowledgedAt: null };
      await tx.tripStop.update({ where: { id }, data: { reschedule: json(intent) } });
      await tx.trip.update({ where: { id: trip.id }, data: { planVersion: { increment: 1 }, version: { increment: 1 } } });
      await tx.order.update({ where: { id: stop.orderId }, data: { version: { increment: 1 } } });
      await this.planning.audit(tx, actor, 'TripStop', id, 'RESCHEDULE_REQUESTED', intent, reason);
      return this.planning.tripView(await this.planning.loadTrip(tx, trip.id));
    });
  }
  async acknowledgeReschedule(actor: Actor, id: string, input: unknown) {
    const body = object(input), expected = version(body.expectedPlanVersion), returnedAt = text(body.returnedAt, 'returnedAt'), lines = inputLines(body.lines, 'returnedQty');
    date(returnedAt.slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(returnedAt) || !Number.isFinite(Date.parse(returnedAt))) fail(400, 'INVALID_INPUT', 'returnedAt must be a valid timestamp with timezone.');
    return this.planning.mutate(actor, 'ACKNOWLEDGE_RESCHEDULE', id, body, async tx => {
      const stop = await tx.tripStop.findUnique({ where: { id }, include: { trip: true, lines: true, delivery: true } });
      if (!stop) fail(404, 'NOT_FOUND', 'Stop not found.');
      const trip = stop.trip;
      if (actor.role !== 'DRIVER' || actor.id !== trip.driverId || actor.vehicleId !== trip.vehicleId) fail(403, 'FORBIDDEN', 'Only the assigned Driver can confirm returned goods.');
      if (trip.planVersion !== expected) fail(409, 'STALE_PLAN', 'Plan version changed.');
      const intent = stop.reschedule as TripView['stops'][number]['reschedule'];
      if (!intent || intent.acknowledgedAt || trip.status !== 'IN_TRANSIT' || trip.releasedAt || !stop.active || !['PLANNED', 'ARRIVED'].includes(stop.status) || stop.delivery) fail(409, 'STOP_STATE_CONFLICT', 'A nonterminal pending reschedule is required.');
      if (Date.parse(returnedAt) > Date.now() || Date.parse(returnedAt) < Date.parse(intent.requestedAt)) fail(422, 'INVALID_RETURN_TIME', 'Return time must be after the request and no later than server time.');
      await this.noConflicts(tx, trip.id, id);
      if (lines.length !== stop.lines.length || !lines.length || stop.lines.some(l => l.pendingUnload || l.loadedQty === null || l.loadedQty !== l.plannedQty - l.cancelledQty || l.deliveredQty !== null || l.returnedQty !== null || lines.find(x => x.orderLineId === l.orderLineId)?.qty !== l.loadedQty)) fail(422, 'RETURN_QUANTITY_MISMATCH', 'Return every loaded line exactly; delivered facts must use delivery recovery.');
      for (const line of stop.lines) await tx.tripStopLine.update({ where: { id: line.id }, data: { returnedQty: line.loadedQty, deliveredQty: 0, version: { increment: 1 } } });
      await tx.tripStop.update({ where: { id }, data: { status: 'RESCHEDULED', active: false, reschedule: json({ ...intent, acknowledgedAt: new Date().toISOString() }) } });
      const deferral = await tx.orderDeferral.create({ data: { orderId: stop.orderId, fromDate: trip.date, toDate: new Date(intent.nextDate), reason: intent.reason, actorId: intent.requestedById, sourceStopId: id } });
      await tx.order.update({ where: { id: stop.orderId }, data: { status: 'DEFERRED', pendingQuantities: json(lines.filter(l => l.qty > 0)), plannedDate: new Date(intent.nextDate), deferredToDate: new Date(intent.nextDate), deferReason: intent.reason, deferralCount: { increment: 1 }, version: { increment: 1 } } });
      const unfinished = await tx.tripStop.count({ where: { tripId: trip.id, sequence: { gt: 0 }, status: { in: ['PLANNED', 'ARRIVED'] } } });
      await tx.trip.update({ where: { id: trip.id }, data: { version: { increment: 1 }, ...(unfinished === 0 ? { status: 'COMPLETED_WITH_EXCEPTIONS' } : {}) } });
      await this.planning.audit(tx, actor, 'TripStop', id, 'RESCHEDULE_ACKNOWLEDGED', { returnedAt: new Date(returnedAt).toISOString(), lines, deferralId: deferral.id }, intent.reason);
      return this.planning.tripView(await this.planning.loadTrip(tx, trip.id));
    });
  }
}
