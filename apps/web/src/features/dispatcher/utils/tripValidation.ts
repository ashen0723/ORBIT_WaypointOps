import type { CalendarDay, Depot, DepotId, Driver, Order, Outlet, Temperature, Trip, Vehicle } from '../types/dispatch';
import { DOCK_EXTRA_MIN, FRESH_DEADLINE, HANDLING_BASE_MIN, HANDLING_PER_UNIT_MIN, LOADING_MIN, MAX_TRIPS_PER_VEHICLE_PER_DAY } from '../data/rules';
import { closureNote, isOperatingDay } from './calendar';
import { formatDate, weekStart } from './clock';
import { driveMin, roadKm } from './geo';
import { formatNumber, outletLabel, tripLabel } from './format';
import { fromMin, isTime, to12h, toMin } from './time';
import { TEMPERATURE_LABEL, temperatureCompatible } from './vehicle';

export type CheckGroup = 'orders' | 'calendar' | 'depot' | 'capacity' | 'vehicle' | 'window' | 'fresh' | 'schedule' | 'time' | 'fuel';

export const CHECK_GROUPS: {group: CheckGroup;ok: string;bad: string;}[] = [
{ group: 'orders', ok: 'Orders free to allocate', bad: 'Order can’t be allocated' },
{ group: 'calendar', ok: 'Operating day', bad: 'Not an operating day' },
{ group: 'depot', ok: 'Same depot', bad: 'Wrong depot' },
{ group: 'capacity', ok: 'Weight & volume fit', bad: 'Capacity exceeded' },
{ group: 'vehicle', ok: 'Vehicle suitable', bad: 'Vehicle not suitable' },
{ group: 'window', ok: 'Delivery windows met', bad: 'Delivery window missed' },
{ group: 'fresh', ok: 'Fresh deadline met', bad: 'Fresh deadline missed' },
{ group: 'schedule', ok: 'No schedule clash', bad: 'Schedule clash' },
{ group: 'time', ok: 'Within daily operating time', bad: 'Operating time exceeded' },
{ group: 'fuel', ok: 'Within weekly fuel budget', bad: 'Weekly fuel budget exceeded' }];


export interface TripIssue {
  key: string;
  group: CheckGroup;
  title: string;
  message: string;
  fix: string;
}

export interface PlannedStop {
  order: Order;
  outlet: Outlet;
  seq: number;
  legKm: number;
  travelMin: number;
  arrival: number;
  wait: number;
  handling: number;
  departure: number;
}

export interface PlanContext {
  orders: Order[];
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  outlets: Outlet[];
  depots: Depot[];
  calendar: CalendarDay[];
}

export interface TripProposal {
  date: string;
  depotId: DepotId;
  orderIds: string[];
  vehicleId: string;
  driverId: string | null;
  departAt?: string | null;
}

export interface TripFeasibility {
  tripMin: number;
  usedMinToday: number;
  maxDailyMin: number;
  fitsTime: boolean;
  fuelL: number;
  weekFuelUsedL: number;
  weeklyBudgetL: number;
  fitsFuel: boolean;
  fresh: {lastArrival: string;late: boolean;} | null;
  tripIndex: number;
  sameDayTrips: {id: string;number: number;departAt: string;returnAt: string;}[];
}

export interface TripValidation {
  ok: boolean;
  issues: TripIssue[];
  passed: Record<CheckGroup, boolean>;
  departMin: number;
  returnMin: number;
  stops: PlannedStop[];
  distanceKm: number;
  driverId: string | null;
  feasibility: TripFeasibility;
}

export function handlingMin(order: Order, outlet: Outlet): number {
  return Math.round(HANDLING_BASE_MIN + order.units * HANDLING_PER_UNIT_MIN + DOCK_EXTRA_MIN[outlet.dock]);
}

export function sequenceOrders(orders: Order[], outlets: Outlet[], depot: Depot): {order: Order;outlet: Outlet;}[] {
  return orders.
  map((order) => ({ order, outlet: outlets.find((o) => o.id === order.outletId) })).
  filter((x): x is {order: Order;outlet: Outlet;} => Boolean(x.outlet)).
  sort((a, b) => toMin(a.order.windowEnd) - toMin(b.order.windowEnd) || toMin(a.order.windowStart) - toMin(b.order.windowStart) || roadKm(depot, a.outlet) - roadKm(depot, b.outlet));
}

export function planRoute(depot: Depot, seq: {order: Order;outlet: Outlet;}[], departMin: number): {stops: PlannedStop[];distanceKm: number;returnMin: number;} {
  let cur: {lat: number;lng: number;} = depot;
  let t = departMin;
  let km = 0;
  const stops: PlannedStop[] = seq.map(({ order, outlet }, i) => {
    const legKm = roadKm(cur, outlet);
    const travelMin = driveMin(legKm);
    const arrival = t + travelMin;
    const wait = Math.max(0, toMin(order.windowStart) - arrival);
    const handling = handlingMin(order, outlet);
    const departure = arrival + wait + handling;
    km += legKm;
    t = departure;
    cur = outlet;
    return { order, outlet, seq: i + 1, legKm, travelMin, arrival, wait, handling, departure };
  });
  const back = seq.length ? roadKm(cur, depot) : 0;
  km += back;
  return { stops, distanceKm: Math.round(km * 10) / 10, returnMin: t + driveMin(back) };
}

/** Trips sharing the vehicle on that date. */
export function vehicleDayTrips(trips: Trip[], vehicleId: string, date: string): Trip[] {
  return trips.filter((t) => t.vehicleId === vehicleId && t.date === date).sort((a, b) => toMin(a.departAt) - toMin(b.departAt));
}

export function occupiedMin(trip: {departAt: string;returnAt: string;}): [number, number] {
  return [toMin(trip.departAt) - LOADING_MIN, toMin(trip.returnAt)];
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

/** Earliest departure that respects depot opening, the first window start and the vehicle's other trips. */
export function defaultDepartMin(depot: Depot, seq: {order: Order;outlet: Outlet;}[], busy: [number, number][]): number {
  const open = toMin(depot.opensAt) + LOADING_MIN;
  const first = seq[0];
  const ideal = first ? toMin(first.order.windowStart) - driveMin(roadKm(depot, first.outlet)) : open;
  let cand = Math.max(open, ideal);
  for (let i = 0; i < 4; i++) {
    const r = planRoute(depot, seq, cand);
    const clash = busy.find((b) => overlaps([cand - LOADING_MIN, r.returnMin], b));
    if (!clash) break;
    cand = clash[1] + LOADING_MIN;
  }
  return cand;
}

function tempOf(orders: Order[]): Temperature[] {
  return Array.from(new Set(orders.map((o) => o.temperature)));
}

/** Orders that can't share a trip with the current ones (single-compartment bodies). */
export function findIncompatible(tripOrders: Order[], adding: Order[]): Order[] {
  const base = tripOrders[0] ?? adding[0];
  if (!base) return [];
  return adding.filter((o) => o.temperature !== base.temperature);
}

/**
 * The single source of truth for trip feasibility. The planning UI renders warnings, success
 * badges and the Confirm button from this result, and the server re-runs it inside the
 * confirmation transaction.
 */
export function validateTrip(ctx: PlanContext, p: TripProposal): TripValidation {
  const issues: TripIssue[] = [];
  const add = (issue: TripIssue) => issues.push(issue);
  const depot = ctx.depots.find((d) => d.id === p.depotId);
  const vehicle = ctx.vehicles.find((v) => v.id === p.vehicleId);
  const orders: Order[] = [];

  const seen = new Set<string>();
  p.orderIds.forEach((id) => {
    if (seen.has(id)) {
      add({ key: `dup-${id}`, group: 'orders', title: 'Duplicate order', message: `${id} is listed twice.`, fix: 'Remove the duplicate.' });
      return;
    }
    seen.add(id);
    const o = ctx.orders.find((x) => x.id === id);
    if (!o) add({ key: `missing-${id}`, group: 'orders', title: 'Order not found', message: `${id} no longer exists.`, fix: 'Remove it from the trip.' });else
    orders.push(o);
  });

  if (!orders.length) add({ key: 'empty', group: 'orders', title: 'No orders', message: 'A trip needs at least one order.', fix: 'Add orders to the trip.' });

  orders.forEach((o) => {
    if (o.status !== 'pending' || o.currentTripId) {
      add({ key: `alloc-${o.id}`, group: 'orders', title: 'Already allocated', message: `${o.id} is already on ${o.currentTripId ?? 'another trip'} (${o.status.replace('_', ' ')}).`, fix: 'Remove it — an order can only be on one active trip.' });
    }
    if (o.plannedDate !== p.date) {
      add({ key: `date-${o.id}`, group: 'orders', title: 'Different delivery date', message: `${o.id} is planned for ${formatDate(o.plannedDate)}, not ${formatDate(p.date)}.`, fix: 'Plan it on its own date, or reschedule it first.' });
    }
    if (o.depotId !== p.depotId) {
      add({ key: `odepot-${o.id}`, group: 'depot', title: 'Order from another depot', message: `${o.id} ships from ${ctx.depots.find((d) => d.id === o.depotId)?.name ?? o.depotId}.`, fix: 'Plan it on a trip from its own depot.' });
    }
  });

  if (!isOperatingDay(ctx.calendar, p.date, p.depotId)) {
    add({ key: 'calendar', group: 'calendar', title: 'Depot closed that day', message: `${formatDate(p.date)}: ${closureNote(ctx.calendar, p.date, p.depotId) || 'not an operating day'}.`, fix: 'Choose an operating day.' });
  }

  const temps = tempOf(orders);
  if (temps.length > 1) {
    add({ key: 'mixed', group: 'vehicle', title: 'Mixed temperatures', message: `This trip mixes ${temps.map((t) => TEMPERATURE_LABEL[t].toLowerCase()).join(' and ')} orders.`, fix: 'Keep one temperature per trip — vehicles have a single compartment.' });
  }

  const empty: TripValidation = {
    ok: false,
    issues,
    passed: passedFrom(issues),
    departMin: 0,
    returnMin: 0,
    stops: [],
    distanceKm: 0,
    driverId: null,
    feasibility: { tripMin: 0, usedMinToday: 0, maxDailyMin: 0, fitsTime: true, fuelL: 0, weekFuelUsedL: 0, weeklyBudgetL: 0, fitsFuel: true, fresh: null, tripIndex: 1, sameDayTrips: [] }
  };
  if (!vehicle || !depot) {
    add({ key: 'novehicle', group: 'vehicle', title: 'Vehicle not found', message: 'Choose a vehicle from the fleet.', fix: 'Select a vehicle.' });
    return { ...empty, issues, passed: passedFrom(issues) };
  }

  if (vehicle.depotId !== p.depotId) {
    add({ key: 'vdepot', group: 'depot', title: 'Vehicle at another depot', message: `${vehicle.id} is based at ${ctx.depots.find((d) => d.id === vehicle.depotId)?.name}.`, fix: `Choose a ${depot.name} vehicle.` });
  }
  const off = vehicle.unavailable.find((u) => u.date === p.date);
  if (off) add({ key: 'unavailable', group: 'vehicle', title: 'Vehicle unavailable', message: `${vehicle.id} is unavailable on ${formatDate(p.date)}: ${off.reason}.`, fix: 'Choose another vehicle.' });

  const sameDay = vehicleDayTrips(ctx.trips, vehicle.id, p.date);
  if (sameDay.length >= MAX_TRIPS_PER_VEHICLE_PER_DAY) {
    add({ key: 'limit', group: 'vehicle', title: 'Trip limit reached', message: `${vehicle.id} already has ${MAX_TRIPS_PER_VEHICLE_PER_DAY} trips on ${formatDate(p.date)}.`, fix: 'Choose another vehicle.' });
  }

  const unsuitable = orders.filter((o) => !temperatureCompatible(vehicle.refrigeration, o.temperature));
  if (unsuitable.length) {
    const need = unsuitable[0].temperature;
    add({
      key: 'temp',
      group: 'vehicle',
      title: 'Wrong temperature',
      message: `${unsuitable.map((o) => o.id).join(', ')} ${unsuitable.length === 1 ? 'needs' : 'need'} ${TEMPERATURE_LABEL[need].toLowerCase()} storage; ${vehicle.id} is ${TEMPERATURE_LABEL[vehicle.refrigeration].toLowerCase()}.`,
      fix: need === 'frozen' ? 'Choose a freezer truck.' : need === 'chilled' ? 'Choose a refrigerated truck or chilled van.' : 'Choose an ambient or chilled vehicle.'
    });
  }

  const outletOf = (o: Order) => ctx.outlets.find((x) => x.id === o.outletId);
  const vanOnly = orders.filter((o) => outletOf(o)?.vanOnly);
  if (vanOnly.length && !vehicle.isVan) {
    add({ key: 'van', group: 'vehicle', title: 'Van-only access', message: `${outletLabel(outletOf(vanOnly[0]))} can only be reached by van.`, fix: 'Choose a van, or remove this order.' });
  }

  const kg = orders.reduce((s, o) => s + o.weightKg, 0);
  const m3 = orders.reduce((s, o) => s + o.volumeM3, 0);
  const overKg = kg - vehicle.capacityKg;
  const overM3 = m3 - vehicle.capacityM3;
  if (overKg > 0 || overM3 > 0) {
    const parts = [overKg > 0 ? `${formatNumber(overKg)} kg` : null, overM3 > 0 ? `${formatNumber(overM3)} m³` : null].filter(Boolean).join(' and ');
    add({ key: 'capacity', group: 'capacity', title: 'Capacity exceeded', message: `This trip is ${parts} over ${vehicle.id}’s limit.`, fix: 'Remove an order or choose a bigger vehicle. Orders can’t be split.' });
  }

  const driverId = p.driverId ?? vehicle.defaultDriverId;
  if (!driverId || !ctx.drivers.some((d) => d.id === driverId)) {
    add({ key: 'driver', group: 'schedule', title: 'No driver', message: `${vehicle.id} has no driver assigned.`, fix: 'Pick a driver for this trip.' });
  }

  const seq = sequenceOrders(orders, ctx.outlets, depot);
  const busy = sameDay.map(occupiedMin);
  let departMin: number;
  if (p.departAt) {
    if (!isTime(p.departAt)) {
      add({ key: 'deptime', group: 'schedule', title: 'Invalid departure time', message: `“${p.departAt}” is not a time.`, fix: 'Use HH:MM.' });
      departMin = defaultDepartMin(depot, seq, busy);
    } else departMin = toMin(p.departAt);
  } else departMin = defaultDepartMin(depot, seq, busy);

  const route = planRoute(depot, seq, departMin);

  if (departMin - LOADING_MIN < toMin(depot.opensAt)) {
    add({ key: 'early', group: 'schedule', title: 'Before depot opens', message: `Loading would start ${to12h(fromMin(departMin - LOADING_MIN))}; ${depot.name} opens ${to12h(depot.opensAt)}.`, fix: `Depart at ${to12h(fromMin(toMin(depot.opensAt) + LOADING_MIN))} or later.` });
  }
  if (route.returnMin > toMin(depot.closesAt)) {
    add({ key: 'late-return', group: 'schedule', title: 'Returns after depot closes', message: `Back at ${to12h(fromMin(route.returnMin))}; ${depot.name} closes ${to12h(depot.closesAt)}.`, fix: 'Depart earlier or remove a stop.' });
  }

  route.stops.forEach((s) => {
    if (s.arrival > toMin(s.order.windowEnd)) {
      add({ key: `window-${s.order.id}`, group: 'window', title: 'Delivery window missed', message: `Arrives ${to12h(fromMin(s.arrival))} at ${outletLabel(s.outlet)}; window closes ${to12h(s.order.windowEnd)}.`, fix: 'Depart earlier, remove a stop, or use a vehicle with no earlier trip.' });
    }
  });

  const freshStops = route.stops.filter((s) => s.order.brand === 'Fresh');
  const lastFresh = freshStops[freshStops.length - 1];
  const freshLate = lastFresh ? lastFresh.arrival > toMin(FRESH_DEADLINE) : false;
  if (lastFresh && freshLate) {
    add({ key: 'fresh', group: 'fresh', title: 'Fresh deadline missed', message: `The last Fresh stop is reached at ${to12h(fromMin(lastFresh.arrival))}; Fresh must arrive by ${to12h(FRESH_DEADLINE)}.`, fix: 'Depart earlier or move a Fresh stop to another vehicle.' });
  }

  const mine: [number, number] = [departMin - LOADING_MIN, route.returnMin];
  sameDay.forEach((t) => {
    if (overlaps(mine, occupiedMin(t))) {
      add({ key: `overlap-${t.id}`, group: 'schedule', title: 'Vehicle double-booked', message: `${vehicle.id} is on ${tripLabel(t.number)} from ${to12h(fromMin(occupiedMin(t)[0]))} to ${to12h(t.returnAt)}.`, fix: `Depart after ${to12h(fromMin(occupiedMin(t)[1] + LOADING_MIN))}, or choose another vehicle.` });
    }
  });
  if (driverId) {
    ctx.trips.
    filter((t) => t.driverId === driverId && t.date === p.date && t.vehicleId !== vehicle.id).
    forEach((t) => {
      if (overlaps(mine, occupiedMin(t))) {
        const name = ctx.drivers.find((d) => d.id === driverId)?.name ?? driverId;
        add({ key: `driver-${t.id}`, group: 'schedule', title: 'Driver double-booked', message: `${name} is driving ${tripLabel(t.number)} (${t.vehicleId}) at that time.`, fix: 'Pick another driver or time.' });
      }
    });
  }

  const tripMin = route.returnMin - (departMin - LOADING_MIN);
  const usedMinToday = sameDay.reduce((s, t) => s + t.durationMin, 0);
  const fitsTime = usedMinToday + tripMin <= vehicle.maxDailyMin;
  if (!fitsTime) {
    add({ key: 'time', group: 'time', title: 'Operating time exceeded', message: `This trip needs ${tripMin} min; ${vehicle.id} has used ${usedMinToday} of ${vehicle.maxDailyMin} min on ${formatDate(p.date)}.`, fix: 'Remove a stop or choose another vehicle.' });
  }

  const fuelL = Math.round(route.distanceKm * vehicle.fuelLPer100Km / 100 * 10) / 10;
  const wk = weekStart(p.date);
  const weekFuelUsedL = Math.round(ctx.trips.filter((t) => t.vehicleId === vehicle.id && weekStart(t.date) === wk).reduce((s, t) => s + t.fuelL, 0) * 10) / 10;
  const fitsFuel = weekFuelUsedL + fuelL <= vehicle.weeklyFuelBudgetL;
  if (!fitsFuel) {
    add({ key: 'fuel', group: 'fuel', title: 'Weekly fuel budget exceeded', message: `Needs ${formatNumber(fuelL)} L; ${vehicle.id} has ${formatNumber(Math.max(0, vehicle.weeklyFuelBudgetL - weekFuelUsedL))} L left this week (${vehicle.weeklyFuelBudgetL} L budget).`, fix: 'Choose another vehicle or shorten the route.' });
  }

  return {
    ok: issues.length === 0,
    issues,
    passed: passedFrom(issues),
    departMin,
    returnMin: route.returnMin,
    stops: route.stops,
    distanceKm: route.distanceKm,
    driverId: driverId ?? null,
    feasibility: {
      tripMin,
      usedMinToday,
      maxDailyMin: vehicle.maxDailyMin,
      fitsTime,
      fuelL,
      weekFuelUsedL,
      weeklyBudgetL: vehicle.weeklyFuelBudgetL,
      fitsFuel,
      fresh: lastFresh ? { lastArrival: fromMin(lastFresh.arrival), late: freshLate } : null,
      tripIndex: sameDay.filter((t) => toMin(t.departAt) < departMin).length + 1,
      sameDayTrips: sameDay.map((t) => ({ id: t.id, number: t.number, departAt: t.departAt, returnAt: t.returnAt }))
    }
  };
}

function passedFrom(issues: TripIssue[]): Record<CheckGroup, boolean> {
  const has = (g: CheckGroup) => issues.some((i) => i.group === g);
  return {
    orders: !has('orders'),
    calendar: !has('calendar'),
    depot: !has('depot'),
    capacity: !has('capacity'),
    vehicle: !has('vehicle'),
    window: !has('window'),
    fresh: !has('fresh'),
    schedule: !has('schedule'),
    time: !has('time'),
    fuel: !has('fuel')
  };
}

export function materializeTrip(v: TripValidation, p: TripProposal, meta: {id: string;number: number;createdBy: string;createdAt: string;}): Trip {
  return {
    id: meta.id,
    number: meta.number,
    date: p.date,
    depotId: p.depotId,
    vehicleId: p.vehicleId,
    driverId: v.driverId ?? '',
    departAt: fromMin(v.departMin),
    returnAt: fromMin(v.returnMin),
    distanceKm: v.distanceKm,
    fuelL: v.feasibility.fuelL,
    durationMin: v.feasibility.tripMin,
    status: 'loading',
    load: v.stops.map((s) => ({ orderId: s.order.id, expectedUnits: s.order.units, loadedUnits: null, damagedUnits: 0, reason: '', recordedBy: null, recordedAt: null })),
    stops: v.stops.map((s) => ({
      orderId: s.order.id,
      outletId: s.outlet.id,
      seq: s.seq,
      plannedArrival: fromMin(s.arrival),
      plannedDepart: fromMin(s.departure),
      waitMin: s.wait,
      handlingMin: s.handling,
      revisedArrival: null,
      status: 'pending',
      arrivedAt: null,
      completedAt: null,
      deliveredUnits: null,
      damagedUnits: 0,
      note: '',
      failedReason: '',
      pod: null,
      delay: null,
      storeNotifiedAt: null
    })),
    exceptionAck: null,
    departedAt: null,
    completedAt: null,
    createdBy: meta.createdBy,
    createdAt: meta.createdAt
  };
}