import type { Brand, DB, DeferralReason, NewOrderInput, Order, Temperature, User } from '../../types/dispatch';
import { deferralReasons } from '../../data/deferrals';
import { closureNote, earliestDeliveryDate, isOperatingDay } from '../../utils/calendar';
import { formatDate, isDate } from '../../utils/clock';
import { fromMin, isTime, toMin } from '../../utils/time';
import { planRoute, sequenceOrders } from '../../utils/tripValidation';
import { temperatureCompatible } from '../../utils/vehicle';
import { ApiError, nextOrderId, pushEvent, recordDeferral, requireRole } from '../support';

const BRANDS: Brand[] = ['Fresh', 'Style', 'Tech'];
const TEMPS: Temperature[] = ['ambient', 'chilled', 'frozen'];

const isPosInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isNonNegInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const isPos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function createOrder(db: DB, user: User, input: NewOrderInput, now: string): {orderId: string;} {
  requireRole(user, 'store_manager');
  const outlet = db.outlets.find((o) => o.id === user.outletId);
  if (!outlet) throw new ApiError(403, 'NO_OUTLET', 'Your account isn’t linked to an outlet.');

  const errors: string[] = [];
  if (!BRANDS.includes(input.brand)) errors.push('Choose a brand: Fresh, Style or Tech.');
  if (!TEMPS.includes(input.temperature)) errors.push('Choose a temperature requirement.');
  if (!isPosInt(input.units)) errors.push('Quantity must be a whole number above 0.');
  if (!isPos(input.weightKg)) errors.push('Weight must be above 0 kg.');
  if (!isPos(input.volumeM3)) errors.push('Volume must be above 0 m³.');
  const windowStart = input.windowStart || outlet.windowStart;
  const windowEnd = input.windowEnd || outlet.windowEnd;
  if (!isTime(windowStart) || !isTime(windowEnd) || toMin(windowStart) >= toMin(windowEnd)) errors.push('Delivery window must start before it ends.');else
  if (toMin(windowStart) < toMin(outlet.windowStart) || toMin(windowEnd) > toMin(outlet.windowEnd)) errors.push(`Delivery window must sit inside the store’s receiving hours (${outlet.windowStart}–${outlet.windowEnd}).`);

  const earliest = earliestDeliveryDate(db.calendar, outlet.depotId, now);
  if (!isDate(input.requestedDate)) errors.push('Choose a delivery date.');else
  if (input.requestedDate < earliest) errors.push(`Earliest delivery date is ${formatDate(earliest)} (4 PM Colombo cutoff).`);else
  if (!isOperatingDay(db.calendar, input.requestedDate, outlet.depotId)) errors.push(`${formatDate(input.requestedDate)} isn’t an operating day (${closureNote(db.calendar, input.requestedDate, outlet.depotId) || 'closed'}).`);

  if (TEMPS.includes(input.temperature) && isPos(input.weightKg) && isPos(input.volumeM3)) {
    const fits = db.vehicles.filter((v) => v.depotId === outlet.depotId && temperatureCompatible(v.refrigeration, input.temperature) && (!outlet.vanOnly || v.isVan));
    if (!fits.length) errors.push('No vehicle at your depot can carry this temperature to your store.');else
    if (!fits.some((v) => v.capacityKg >= input.weightKg && v.capacityM3 >= input.volumeM3)) errors.push('Too large for any suitable vehicle. Split it into smaller orders.');
  }
  if (errors.length) throw new ApiError(422, 'INVALID_ORDER', errors[0], errors);

  const order: Order = {
    id: nextOrderId(db),
    outletId: outlet.id,
    depotId: outlet.depotId,
    brand: input.brand,
    temperature: input.temperature,
    requestedDate: input.requestedDate,
    plannedDate: input.requestedDate,
    createdAt: now,
    createdBy: user.id,
    units: input.units,
    weightKg: Math.round(input.weightKg * 10) / 10,
    volumeM3: Math.round(input.volumeM3 * 100) / 100,
    windowStart,
    windowEnd,
    status: 'pending',
    currentTripId: null,
    attempts: [],
    deferralCount: 0,
    note: (input.note ?? '').trim().slice(0, 300),
    deliveredUnits: null,
    receipt: null
  };
  db.orders.push(order);
  pushEvent(db, user, now, { type: 'order_created', orderId: order.id, outletId: outlet.id, depotId: outlet.depotId, message: `${order.id} placed: ${order.brand} ${order.temperature}, ${order.units} units for ${order.requestedDate}` });
  return { orderId: order.id };
}

export function confirmReceipt(db: DB, user: User, input: {orderId: string;receivedUnits: number;damagedUnits: number;note: string;}, now: string): {orderId: string;} {
  requireRole(user, 'store_manager');
  const order = db.orders.find((o) => o.id === input.orderId && o.outletId === user.outletId);
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
  if (order.status !== 'delivered' && order.status !== 'partially_delivered') throw new ApiError(409, 'NOT_DELIVERED', 'You can confirm receipt once the driver has delivered it.');
  if (order.receipt) throw new ApiError(409, 'ALREADY_CONFIRMED', 'Receipt was already confirmed.');
  const delivered = order.deliveredUnits ?? 0;
  if (!isNonNegInt(input.receivedUnits) || !isNonNegInt(input.damagedUnits)) throw new ApiError(422, 'INVALID', 'Quantities must be whole numbers.');
  if (input.receivedUnits + input.damagedUnits > delivered) throw new ApiError(422, 'INVALID', `Received + damaged can’t exceed the ${delivered} units the driver handed over.`);
  const missingUnits = order.units - input.receivedUnits - input.damagedUnits;
  if ((missingUnits > 0 || input.damagedUnits > 0) && !input.note.trim()) throw new ApiError(422, 'NOTE_REQUIRED', 'Describe what was missing or damaged.');
  order.receipt = { receivedUnits: input.receivedUnits, damagedUnits: input.damagedUnits, missingUnits, note: input.note.trim(), confirmedAt: now, confirmedBy: user.id };
  pushEvent(db, user, now, {
    type: 'receipt_confirmed',
    orderId: order.id,
    outletId: order.outletId,
    depotId: order.depotId,
    tripId: order.currentTripId ?? order.attempts[order.attempts.length - 1],
    message: `${order.id} receipt: ${input.receivedUnits} received${input.damagedUnits ? `, ${input.damagedUnits} damaged` : ''}${missingUnits ? `, ${missingUnits} missing` : ''}${input.note.trim() ? ` — ${input.note.trim()}` : ''}`
  });
  return { orderId: order.id };
}

function checkTargetDate(db: DB, order: Order, toDate: string, now: string): void {
  const earliest = earliestDeliveryDate(db.calendar, order.depotId, now);
  if (!isDate(toDate)) throw new ApiError(422, 'INVALID_DATE', 'Choose a new date.');
  if (toDate < earliest) throw new ApiError(422, 'TOO_EARLY', `Earliest valid date is ${formatDate(earliest)}.`);
  if (!isOperatingDay(db.calendar, toDate, order.depotId)) throw new ApiError(422, 'NOT_OPERATING', `${formatDate(toDate)} isn’t an operating day.`);
}

/** Removes an order from a trip still at the depot and re-times the remaining stops. */
function pullFromLoadingTrip(db: DB, order: Order): void {
  const trip = db.trips.find((t) => t.id === order.currentTripId);
  if (!trip) return;
  trip.load = trip.load.filter((l) => l.orderId !== order.id);
  trip.stops = trip.stops.filter((s) => s.orderId !== order.id);
  if (!trip.stops.length) {
    db.trips = db.trips.filter((t) => t.id !== trip.id);
    return;
  }
  const depot = db.depots.find((d) => d.id === trip.depotId);
  const vehicle = db.vehicles.find((v) => v.id === trip.vehicleId);
  if (!depot || !vehicle) return;
  const remaining = trip.stops.map((s) => db.orders.find((o) => o.id === s.orderId)).filter((o): o is Order => Boolean(o));
  const route = planRoute(depot, sequenceOrders(remaining, db.outlets, depot), toMin(trip.departAt));
  trip.stops = route.stops.map((rs) => {
    const prev = trip.stops.find((s) => s.orderId === rs.order.id);
    return { ...(prev as NonNullable<typeof prev>), seq: rs.seq, plannedArrival: fromMin(rs.arrival), plannedDepart: fromMin(rs.departure), waitMin: rs.wait, handlingMin: rs.handling };
  });
  trip.returnAt = fromMin(route.returnMin);
  trip.distanceKm = route.distanceKm;
  trip.fuelL = Math.round(route.distanceKm * vehicle.fuelLPer100Km / 100 * 10) / 10;
  trip.durationMin = route.returnMin - (toMin(trip.departAt) - 30);
}

export function deferOrder(db: DB, user: User, input: {orderId: string;reason: DeferralReason;note: string;toDate: string;}, now: string): {orderId: string;toDate: string;} {
  requireRole(user, 'dispatcher');
  const order = db.orders.find((o) => o.id === input.orderId);
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
  if (!deferralReasons.some((r) => r.value === input.reason)) throw new ApiError(422, 'INVALID_REASON', 'Choose a reason.');
  if (input.reason === 'other' && !input.note.trim()) throw new ApiError(422, 'NOTE_REQUIRED', 'Explain the reason.');
  if (order.status === 'delivered' || order.status === 'partially_delivered') throw new ApiError(409, 'DELIVERED', 'Delivered orders can’t be deferred.');
  checkTargetDate(db, order, input.toDate, now);

  const tripId = order.currentTripId;
  if (order.status === 'allocated') pullFromLoadingTrip(db, order);
  if (order.status === 'in_transit') {
    const trip = db.trips.find((t) => t.id === tripId);
    const stop = trip?.stops.find((s) => s.orderId === order.id);
    if (trip && stop) {
      if (stop.status === 'delivered' || stop.status === 'failed') throw new ApiError(409, 'STOP_DONE', 'This stop is already finished.');
      stop.status = 'deferred';
      stop.failedReason = `Deferred by dispatcher: ${input.note.trim() || input.reason}`;
      if (trip.stops.every((s) => ['delivered', 'failed', 'deferred'].includes(s.status))) {
        trip.status = 'completed';
        trip.completedAt = now;
      }
    }
  }
  recordDeferral(db, user, order, { kind: 'deferred', reason: input.reason, note: input.note.trim(), toDate: input.toDate, tripId }, now);
  return { orderId: order.id, toDate: input.toDate };
}

export function rescheduleOrder(db: DB, user: User, input: {orderId: string;newDate: string;note: string;}, now: string): {orderId: string;} {
  requireRole(user, 'dispatcher');
  const order = db.orders.find((o) => o.id === input.orderId);
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
  if (order.status !== 'pending') throw new ApiError(409, 'NOT_PENDING', 'Only orders waiting for a trip can be rescheduled. Defer it from its trip first.');
  if (input.newDate === order.plannedDate) throw new ApiError(422, 'SAME_DATE', 'Choose a different date.');
  checkTargetDate(db, order, input.newDate, now);
  recordDeferral(db, user, order, { kind: 'rescheduled', reason: 'manual', note: input.note.trim(), toDate: input.newDate, tripId: null }, now);
  return { orderId: order.id };
}