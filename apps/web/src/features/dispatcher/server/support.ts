import type { DB, DeferralEvent, DeferralReason, OpsEvent, Order, PublicUser, Role, User } from '../types/dispatch';
import { ROLE_LABEL } from '../data/users';
import { earliestDeliveryDate, laterOf, nextOperatingDay } from '../utils/calendar';
import type { PlanContext } from '../utils/tripValidation';

export class ApiError extends Error {
  status: number;
  code: string;
  details: string[];
  constructor(status: number, code: string, message: string, details: string[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function requireRole(user: User, ...roles: Role[]): void {
  if (!roles.includes(user.role)) throw new ApiError(403, 'FORBIDDEN', `${ROLE_LABEL[user.role]} accounts aren’t allowed to do this.`);
}

export function publicUser(user: User): PublicUser {
  const { passwordHash: _hash, ...rest } = user;
  return rest;
}

export function pushEvent(db: DB, user: User | null, at: string, e: Omit<OpsEvent, 'id' | 'actorId' | 'actorName' | 'at'>): void {
  db.counters.event += 1;
  db.events.unshift({ id: `EVT-${db.counters.event}`, at, actorId: user?.id ?? 'system', actorName: user?.name ?? 'System', ...e });
}

export function planContext(db: DB): PlanContext {
  return { orders: db.orders, trips: db.trips, vehicles: db.vehicles, drivers: db.drivers, outlets: db.outlets, depots: db.depots, calendar: db.calendar };
}

export function nextOrderId(db: DB): string {
  db.counters.order += 1;
  return `ORD-${db.counters.order}`;
}

export function nextTrip(db: DB): {id: string;number: number;} {
  db.counters.trip += 1;
  return { id: `TRP-${String(db.counters.trip).padStart(3, '0')}`, number: db.counters.trip };
}

/** Next valid operating date after the order's current date that also respects the cutoff. */
export function autoDeferDate(db: DB, order: Order, nowIso: string): string {
  return laterOf(nextOperatingDay(db.calendar, order.depotId, order.plannedDate), earliestDeliveryDate(db.calendar, order.depotId, nowIso));
}

interface DeferInput {
  kind: DeferralEvent['kind'];
  reason: DeferralReason;
  note: string;
  toDate: string;
  tripId: string | null;
}

/** Moves the order back into the planning queue on `toDate` and keeps a permanent history entry. */
export function recordDeferral(db: DB, actor: User | null, order: Order, input: DeferInput, at: string): DeferralEvent {
  const event: DeferralEvent = {
    id: `DEF-${db.deferrals.length + 1}-${order.id}`,
    kind: input.kind,
    orderId: order.id,
    outletId: order.outletId,
    reason: input.reason,
    note: input.note,
    fromDate: order.plannedDate,
    toDate: input.toDate,
    tripId: input.tripId,
    actorId: actor?.id ?? 'system',
    actorName: actor?.name ?? 'System',
    at
  };
  db.deferrals.unshift(event);
  order.plannedDate = input.toDate;
  order.status = 'pending';
  order.currentTripId = null;
  if (input.kind === 'deferred') order.deferralCount += 1;
  pushEvent(db, actor, at, {
    type: input.kind === 'deferred' ? 'order_deferred' : 'order_rescheduled',
    orderId: order.id,
    outletId: order.outletId,
    depotId: order.depotId,
    tripId: input.tripId ?? undefined,
    message: `${order.id} ${input.kind === 'deferred' ? 'deferred' : 'rescheduled'} from ${event.fromDate} to ${event.toDate}${input.note ? ` — ${input.note}` : ''}`
  });
  return event;
}