import type { DB, User } from '../../types/dispatch';
import { formatDate, isDate } from '../../utils/clock';
import { outletLabel, tripLabel } from '../../utils/format';
import { to12h } from '../../utils/time';
import { materializeTrip, validateTrip, type TripProposal } from '../../utils/tripValidation';
import { ApiError, nextTrip, planContext, pushEvent, requireRole } from '../support';

/** Authoritative confirmation: re-runs every planning constraint against the current database. */
export function confirmTrip(db: DB, user: User, proposal: TripProposal, now: string): {tripId: string;} {
  requireRole(user, 'dispatcher');
  if (!proposal || !Array.isArray(proposal.orderIds) || typeof proposal.vehicleId !== 'string' || !isDate(proposal.date)) {
    throw new ApiError(422, 'INVALID', 'Trip proposal is incomplete.');
  }
  const result = validateTrip(planContext(db), proposal);
  if (!result.ok) {
    throw new ApiError(
      422,
      'VALIDATION',
      `Trip can’t be confirmed: ${result.issues[0].title.toLowerCase()}.`,
      result.issues.map((i) => `${i.group}|${i.title}: ${i.message}`)
    );
  }
  const { id, number } = nextTrip(db);
  const trip = materializeTrip(result, proposal, { id, number, createdBy: user.id, createdAt: now });
  db.trips.push(trip);
  trip.stops.forEach((s) => {
    const order = db.orders.find((o) => o.id === s.orderId);
    if (!order) return;
    order.status = 'allocated';
    order.currentTripId = trip.id;
    order.attempts.push(trip.id);
    pushEvent(db, user, now, {
      type: 'order_allocated',
      orderId: order.id,
      outletId: order.outletId,
      tripId: trip.id,
      depotId: trip.depotId,
      message: `${order.id} allocated to ${tripLabel(number)} on ${formatDate(trip.date)} — ETA ${to12h(s.plannedArrival)}`
    });
  });
  pushEvent(db, user, now, { type: 'trip_confirmed', tripId: trip.id, depotId: trip.depotId, message: `${tripLabel(number)} confirmed: ${trip.vehicleId}, ${trip.stops.length} stops, departs ${to12h(trip.departAt)} on ${formatDate(trip.date)}` });
  return { tripId: trip.id };
}

/** Records that the store was told. Never clears the physical delay. */
export function notifyStore(db: DB, user: User, input: {tripId: string;orderId: string;message: string;}, now: string): {notifiedAt: string;} {
  requireRole(user, 'dispatcher');
  const trip = db.trips.find((t) => t.id === input.tripId);
  const stop = trip?.stops.find((s) => s.orderId === input.orderId);
  if (!trip || !stop) throw new ApiError(404, 'NOT_FOUND', 'Stop not found.');
  stop.storeNotifiedAt = now;
  const outlet = db.outlets.find((o) => o.id === stop.outletId);
  const eta = stop.revisedArrival ?? stop.plannedArrival;
  pushEvent(db, user, now, {
    type: 'store_notified',
    orderId: stop.orderId,
    tripId: trip.id,
    outletId: stop.outletId,
    depotId: trip.depotId,
    message: input.message.trim() || `${outletLabel(outlet)}: delivery for ${stop.orderId} now expected around ${to12h(eta)}${stop.delay ? ` (${stop.delay.reason})` : ''}.`
  });
  return { notifiedAt: now };
}

export function setVehicleAvailability(db: DB, user: User, input: {vehicleId: string;date: string;available: boolean;reason: string;}, now: string): {vehicleId: string;} {
  requireRole(user, 'dispatcher');
  const vehicle = db.vehicles.find((v) => v.id === input.vehicleId);
  if (!vehicle) throw new ApiError(404, 'NOT_FOUND', 'Vehicle not found.');
  if (!isDate(input.date)) throw new ApiError(422, 'INVALID_DATE', 'Choose a date.');
  if (!input.available) {
    if (!input.reason.trim()) throw new ApiError(422, 'REASON_REQUIRED', 'Give a reason.');
    const busy = db.trips.filter((t) => t.vehicleId === vehicle.id && t.date === input.date && t.status !== 'completed');
    if (busy.length) throw new ApiError(409, 'HAS_TRIPS', `${vehicle.id} has ${busy.map((t) => tripLabel(t.number)).join(', ')} that day. Defer those orders first.`);
    vehicle.unavailable = [...vehicle.unavailable.filter((u) => u.date !== input.date), { date: input.date, reason: input.reason.trim() }];
  } else {
    vehicle.unavailable = vehicle.unavailable.filter((u) => u.date !== input.date);
  }
  pushEvent(db, user, now, { type: 'vehicle_availability', depotId: vehicle.depotId, message: `${vehicle.id} marked ${input.available ? 'available' : `unavailable (${input.reason.trim()})`} on ${formatDate(input.date)}` });
  return { vehicleId: vehicle.id };
}