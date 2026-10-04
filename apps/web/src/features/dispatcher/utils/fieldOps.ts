import type { LoadLine, ProofOfDelivery, Stop, Trip } from '../types/dispatch';
import { colomboParts } from './clock';
import { fromMin, toMin } from './time';

/** Actions recorded by loaders and drivers. Every one is queued offline and replayed idempotently. */
export type FieldAction =
{type: 'recordLoad';tripId: string;orderId: string;loadedUnits: number;damagedUnits: number;reason: string;} |
{type: 'ackExceptions';tripId: string;note: string;} |
{type: 'depart';tripId: string;} |
{type: 'arrive';tripId: string;orderId: string;} |
{type: 'reportDelay';tripId: string;orderId: string;minutes: number;reason: string;} |
{type: 'deliver';tripId: string;orderId: string;deliveredUnits: number;damagedUnits: number;note: string;pod: ProofOfDelivery;} |
{type: 'failStop';tripId: string;orderId: string;reason: string;};

export const LOADER_ACTIONS: FieldAction['type'][] = ['recordLoad', 'ackExceptions', 'depart'];
export const DRIVER_ACTIONS: FieldAction['type'][] = ['arrive', 'reportDelay', 'deliver', 'failStop'];

export function lineHasException(l: LoadLine): boolean {
  return l.loadedUnits !== null && (l.loadedUnits < l.expectedUnits || l.damagedUnits > 0);
}

export function missingUnits(l: LoadLine): number {
  return l.loadedUnits === null ? 0 : Math.max(0, l.expectedUnits - l.loadedUnits - l.damagedUnits);
}

export interface DepartureReadiness {
  ready: boolean;
  unrecorded: number;
  exceptions: LoadLine[];
  needsAck: boolean;
  reason: string;
}

/** Same rule on the loader screen and in the server's depart handler. */
export function departureReadiness(trip: Trip): DepartureReadiness {
  const unrecorded = trip.load.filter((l) => l.loadedUnits === null).length;
  const exceptions = trip.load.filter(lineHasException);
  const needsAck = exceptions.length > 0 && !trip.exceptionAck;
  const allMissing = trip.load.every((l) => l.loadedUnits === 0);
  let reason = '';
  if (trip.status !== 'loading') reason = 'This trip has already left.';else
  if (unrecorded) reason = `${unrecorded} order${unrecorded === 1 ? '' : 's'} not recorded yet.`;else
  if (allMissing) reason = 'Nothing was loaded. Ask the dispatcher to defer these orders instead.';else
  if (needsAck) reason = 'Acknowledge the loading exceptions before departure.';
  return { ready: reason === '', unrecorded, exceptions, needsAck, reason };
}

const TERMINAL: Stop['status'][] = ['delivered', 'failed', 'deferred'];
export const isTerminal = (s: Stop) => TERMINAL.includes(s.status);

function minutesLate(stop: Stop, trip: Trip, atIso: string): number {
  const { date, time } = colomboParts(atIso);
  if (date !== trip.date) return 0;
  return Math.max(0, toMin(time) - toMin(stop.plannedArrival));
}

function propagate(stops: Stop[], fromSeq: number, lateMin: number): Stop[] {
  return stops.map((s) => s.seq > fromSeq && !isTerminal(s) && s.status !== 'arrived' ? { ...s, revisedArrival: lateMin > 0 ? fromMin(toMin(s.plannedArrival) + lateMin) : null } : s);
}

function finish(trip: Trip, atIso: string): Trip {
  if (trip.status === 'on_road' && trip.stops.every(isTerminal)) return { ...trip, status: 'completed', completedAt: atIso };
  return trip;
}

/** Pure trip mutation shared by the server handler and the client's offline overlay. */
export function applyFieldAction(trip: Trip, a: FieldAction, actorName: string, atIso: string): Trip {
  const orderId = 'orderId' in a ? a.orderId : null;
  const mapStop = (fn: (s: Stop) => Stop) => trip.stops.map((s) => orderId !== null && s.orderId === orderId ? fn(s) : s);
  const stop = orderId ? trip.stops.find((s) => s.orderId === orderId) : undefined;
  switch (a.type) {
    case 'recordLoad':{
        const { loadedUnits, damagedUnits, reason } = a;
        const load = trip.load.map((l) => l.orderId === orderId ? { ...l, loadedUnits, damagedUnits, reason: reason.trim(), recordedBy: actorName, recordedAt: atIso } : l);
        const line = load.find((l) => l.orderId === orderId);
        // A new exception invalidates any earlier acknowledgement.
        return { ...trip, load, exceptionAck: line && lineHasException(line) ? null : trip.exceptionAck };
      }
    case 'ackExceptions':
      return { ...trip, exceptionAck: { by: actorName, at: atIso, note: a.note.trim() } };
    case 'depart':{
        const notLoaded = new Set(trip.load.filter((l) => l.loadedUnits === 0).map((l) => l.orderId));
        return {
          ...trip,
          status: 'on_road',
          departedAt: atIso,
          stops: trip.stops.map((s) => notLoaded.has(s.orderId) ? { ...s, status: 'deferred', failedReason: 'Not loaded at depot' } : s)
        };
      }
    case 'arrive':{
        if (!stop) return trip;
        const late = minutesLate(stop, trip, atIso);
        const stops = mapStop((s) => ({ ...s, status: 'arrived', arrivedAt: atIso, revisedArrival: null, delay: s.delay && !s.delay.resolvedAt ? { ...s.delay, resolvedAt: atIso } : s.delay }));
        return { ...trip, stops: propagate(stops, stop.seq, late) };
      }
    case 'reportDelay':{
        if (!stop) return trip;
        const { minutes, reason } = a;
        const stops = mapStop((s) => ({
          ...s,
          revisedArrival: fromMin(toMin(s.plannedArrival) + minutes),
          delay: { minutes, reason: reason.trim(), reportedAt: atIso, reportedBy: actorName, resolvedAt: null }
        }));
        return { ...trip, stops: propagate(stops, stop.seq, minutes) };
      }
    case 'deliver':{
        if (!stop) return trip;
        const { deliveredUnits, damagedUnits, note, pod } = a;
        const late = minutesLate(stop, trip, stop.arrivedAt ?? atIso);
        const stops = mapStop((s) => ({
          ...s,
          status: 'delivered',
          arrivedAt: s.arrivedAt ?? atIso,
          completedAt: atIso,
          deliveredUnits,
          damagedUnits,
          note: note.trim(),
          pod,
          revisedArrival: null,
          delay: s.delay && !s.delay.resolvedAt ? { ...s.delay, resolvedAt: atIso } : s.delay
        }));
        return finish({ ...trip, stops: propagate(stops, stop.seq, late) }, atIso);
      }
    case 'failStop':{
        const reason = a.reason.trim();
        const stops = mapStop((s) => ({ ...s, status: 'failed', completedAt: atIso, failedReason: reason, arrivedAt: s.arrivedAt ?? atIso }));
        return finish({ ...trip, stops }, atIso);
      }
    default:
      return trip;
  }
}

export function fieldActionLabel(a: FieldAction): string {
  switch (a.type) {
    case 'recordLoad':
      return `Loading count · ${a.orderId}`;
    case 'ackExceptions':
      return 'Exceptions acknowledged';
    case 'depart':
      return 'Trip departed';
    case 'arrive':
      return `Arrived · ${a.orderId}`;
    case 'reportDelay':
      return `Delay ${a.minutes} min · ${a.orderId}`;
    case 'deliver':
      return `Delivered · ${a.orderId}`;
    case 'failStop':
      return `Failed attempt · ${a.orderId}`;
    default:
      return 'Action';
  }
}