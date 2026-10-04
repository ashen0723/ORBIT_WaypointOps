import type { DB, User } from '../../types/dispatch';
import { applyFieldAction, departureReadiness, DRIVER_ACTIONS, isTerminal, lineHasException, LOADER_ACTIONS, missingUnits, type FieldAction } from '../../utils/fieldOps';
import { outletLabel, tripLabel } from '../../utils/format';
import { to12h } from '../../utils/time';
import { ApiError, autoDeferDate, pushEvent, recordDeferral, requireRole } from '../support';

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/**
 * Loader and driver actions. Ownership and state are re-checked on every replay, so an action recorded
 * offline against a trip that has since been reassigned or deferred comes back as an explicit conflict.
 */
export function handleField(db: DB, user: User, action: FieldAction, now: string): {tripId: string;tripStatus: string;} {
  const trip = db.trips.find((t) => t.id === action.tripId);
  if (!trip) throw new ApiError(409, 'TRIP_GONE', 'This trip no longer exists — the dispatcher changed the plan.');

  if (LOADER_ACTIONS.includes(action.type)) {
    requireRole(user, 'loader');
    if (user.depotId !== trip.depotId) throw new ApiError(403, 'OTHER_DEPOT', 'This trip loads at another depot.');
    if (trip.status !== 'loading') throw new ApiError(409, 'TRIP_DEPARTED', 'This trip has already left the depot.');
  } else if (DRIVER_ACTIONS.includes(action.type)) {
    requireRole(user, 'driver');
    if (trip.driverId !== user.driverId) throw new ApiError(409, 'REASSIGNED', 'This trip is no longer assigned to you.');
    if (trip.status === 'loading') throw new ApiError(409, 'NOT_DEPARTED', 'The loader hasn’t released this trip yet.');
    if (trip.status === 'completed') throw new ApiError(409, 'TRIP_COMPLETED', 'This trip is already complete.');
  } else {
    throw new ApiError(422, 'UNKNOWN_ACTION', 'Unknown action.');
  }

  const orderId = 'orderId' in action ? action.orderId : null;
  const order = orderId ? db.orders.find((o) => o.id === orderId) : undefined;
  const stop = orderId ? trip.stops.find((s) => s.orderId === orderId) : undefined;
  const line = orderId ? trip.load.find((l) => l.orderId === orderId) : undefined;
  if (orderId) {
    if (!order || !line || !stop || order.currentTripId !== trip.id) throw new ApiError(409, 'ORDER_MOVED', `${orderId} was moved off this trip by the dispatcher.`);
    if (stop.status === 'deferred') throw new ApiError(409, 'ORDER_DEFERRED', `${orderId} was deferred to ${order.plannedDate}.`);
  }
  const outletId = stop?.outletId;
  const outlet = outletId ? db.outlets.find((o) => o.id === outletId) : undefined;

  switch (action.type) {
    case 'recordLoad':{
        if (!line) break;
        if (!isInt(action.loadedUnits) || !isInt(action.damagedUnits) || action.loadedUnits < 0 || action.damagedUnits < 0) throw new ApiError(422, 'INVALID', 'Quantities must be whole numbers.');
        if (action.loadedUnits + action.damagedUnits > line.expectedUnits) throw new ApiError(422, 'INVALID', `Loaded + damaged can’t exceed ${line.expectedUnits} expected units.`);
        if ((action.loadedUnits < line.expectedUnits || action.damagedUnits > 0) && !action.reason.trim()) throw new ApiError(422, 'REASON_REQUIRED', 'Give a reason for the missing or damaged units.');
        break;
      }
    case 'ackExceptions':
      if (!trip.load.some(lineHasException)) throw new ApiError(409, 'NOTHING_TO_ACK', 'There are no loading exceptions to acknowledge.');
      break;
    case 'depart':{
        const r = departureReadiness(trip);
        if (!r.ready) throw new ApiError(409, 'NOT_READY', r.reason);
        break;
      }
    case 'arrive':
      if (stop && stop.status !== 'pending') throw new ApiError(409, stop.status === 'arrived' ? 'ALREADY_ARRIVED' : 'ALREADY_COMPLETED', `Already recorded as ${stop.status}.`);
      break;
    case 'reportDelay':
      if (stop && isTerminal(stop)) throw new ApiError(409, 'ALREADY_COMPLETED', 'This stop is already finished.');
      if (!isInt(action.minutes) || action.minutes < 1 || action.minutes > 600) throw new ApiError(422, 'INVALID', 'Delay must be 1–600 minutes.');
      if (!action.reason.trim()) throw new ApiError(422, 'REASON_REQUIRED', 'Give a delay reason.');
      break;
    case 'deliver':{
        if (stop && isTerminal(stop)) throw new ApiError(409, 'ALREADY_COMPLETED', `${action.orderId} is already ${stop.status}.`);
        const loaded = line?.loadedUnits ?? 0;
        if (!isInt(action.deliveredUnits) || action.deliveredUnits < 1 || action.deliveredUnits > loaded) throw new ApiError(422, 'INVALID', `Delivered quantity must be 1–${loaded} (units loaded).`);
        if (!isInt(action.damagedUnits) || action.damagedUnits < 0 || action.damagedUnits > action.deliveredUnits) throw new ApiError(422, 'INVALID', 'Damaged units can’t exceed delivered units.');
        if ((action.deliveredUnits < loaded || action.damagedUnits > 0) && !action.note.trim()) throw new ApiError(422, 'NOTE_REQUIRED', 'Describe the shortage or damage.');
        if (!action.pod?.recipientName?.trim()) throw new ApiError(422, 'POD_REQUIRED', 'Enter the name of the person receiving the goods.');
        if (!action.pod.signature?.startsWith('data:image/')) throw new ApiError(422, 'POD_REQUIRED', 'Capture the recipient’s signature.');
        break;
      }
    case 'failStop':
      if (stop && isTerminal(stop)) throw new ApiError(409, 'ALREADY_COMPLETED', 'This stop is already finished.');
      if (!action.reason.trim()) throw new ApiError(422, 'REASON_REQUIRED', 'Give a reason.');
      break;
  }

  const updated = applyFieldAction(trip, action, user.name, now);
  db.trips = db.trips.map((t) => t.id === trip.id ? updated : t);
  const refs = { tripId: trip.id, depotId: trip.depotId };

  switch (action.type) {
    case 'recordLoad':{
        const l = updated.load.find((x) => x.orderId === orderId);
        pushEvent(db, user, now, { ...refs, type: 'load_recorded', orderId: action.orderId, message: `${action.orderId}: ${action.loadedUnits}/${line?.expectedUnits} loaded` });
        if (l && lineHasException(l)) {
          const missing = missingUnits(l);
          pushEvent(db, user, now, {
            ...refs,
            type: 'loading_exception',
            orderId: action.orderId,
            outletId: stop?.outletId,
            message: `${action.orderId} loading exception: ${l.loadedUnits} loaded${missing ? `, ${missing} missing` : ''}${l.damagedUnits ? `, ${l.damagedUnits} damaged` : ''} — ${l.reason}`
          });
        }
        break;
      }
    case 'ackExceptions':
      pushEvent(db, user, now, { ...refs, type: 'exceptions_acknowledged', message: `${tripLabel(trip.number)} loading exceptions acknowledged${action.note.trim() ? ` — ${action.note.trim()}` : ''}` });
      break;
    case 'depart':
      updated.stops.forEach((s) => {
        const o = db.orders.find((x) => x.id === s.orderId);
        if (!o) return;
        if (s.status === 'deferred') {
          recordDeferral(db, null, o, { kind: 'deferred', reason: 'not_loaded', note: 'Entirely missing at loading', toDate: autoDeferDate(db, o, now), tripId: trip.id }, now);
        } else {
          o.status = 'in_transit';
          pushEvent(db, user, now, { ...refs, type: 'trip_departed', orderId: o.id, outletId: o.outletId, message: `${o.id} is on the way — ETA ${to12h(s.plannedArrival)}` });
        }
      });
      pushEvent(db, user, now, { ...refs, type: 'trip_departed', message: `${tripLabel(trip.number)} departed with ${updated.stops.filter((s) => s.status !== 'deferred').length} stops` });
      break;
    case 'arrive':
      pushEvent(db, user, now, { ...refs, type: 'stop_arrived', orderId: action.orderId, outletId: stop?.outletId, message: `Driver arrived at ${outletLabel(outlet)}` });
      break;
    case 'reportDelay':{
        const reason = action.reason.trim();
        updated.stops.
        filter((x) => x.revisedArrival && !isTerminal(x)).
        forEach((x) =>
        pushEvent(db, user, now, { ...refs, type: 'delay_reported', orderId: x.orderId, outletId: x.outletId, message: `${x.orderId} delayed — new ETA ${to12h(x.revisedArrival as string)}${x.orderId === orderId ? `: ${reason}` : ' (knock-on delay)'}` })
        );
        break;
      }
    case 'deliver':
      if (order) {
        order.deliveredUnits = action.deliveredUnits;
        order.status = action.deliveredUnits < order.units ? 'partially_delivered' : 'delivered';
      }
      pushEvent(db, user, now, {
        ...refs,
        type: 'stop_delivered',
        orderId: action.orderId,
        outletId: stop?.outletId,
        message: `${action.orderId} delivered: ${action.deliveredUnits} units${action.damagedUnits ? `, ${action.damagedUnits} damaged` : ''} — signed by ${action.pod.recipientName.trim()}`
      });
      break;
    case 'failStop':
      if (order) recordDeferral(db, user, order, { kind: 'deferred', reason: 'delivery_failed', note: action.reason.trim(), toDate: autoDeferDate(db, order, now), tripId: trip.id }, now);
      pushEvent(db, user, now, { ...refs, type: 'stop_failed', orderId: action.orderId, outletId: stop?.outletId, message: `Delivery attempt failed at ${outletLabel(outlet)}: ${action.reason.trim()}` });
      break;
  }

  if (trip.status !== 'completed' && updated.status === 'completed') {
    pushEvent(db, user, now, { ...refs, type: 'trip_completed', message: `${tripLabel(trip.number)} completed` });
  }
  return { tripId: trip.id, tripStatus: updated.status };
}