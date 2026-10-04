import type { PlanInput, PlanningReason, ValidatePlanResponse } from '@waypoint/contracts';
import type { Prisma, Trip, Vehicle, TravelLeg, OperatingDay, OutletHandling, VehicleAvailability } from '../generated/prisma/client';
import { localInstant, weekStart } from './planning.input';

export type PlanningOrder = Prisma.OrderGetPayload<{ include: { outlet: true; lines: true; stops: { include: { lines: true } } } }>;
export interface PlanningData {
  vehicle: (Vehicle & { drivers: { id: string }[] }) | null;
  orders: PlanningOrder[];
  trips: Trip[];
  operatingDay: OperatingDay | null;
  availability: VehicleAvailability | null;
  legs: TravelLeg[];
  handling: OutletHandling[];
}
export function evaluatePlan(plan: PlanInput, data: PlanningData, replacingTripId?: string, now = new Date()): ValidatePlanResponse {
  const reasons: PlanningReason[] = [];
  const add = (code: PlanningReason['code'], message: string, entityId: string | null = null, field: string | null = null, actual?: number, limit?: number) => {
    reasons.push({ code, message, entityId, field, ...(actual === undefined ? {} : { actual }), ...(limit === undefined ? {} : { limit }) });
  };
  const { vehicle } = data;
  let calculable = true;
  const invalidReference = (message: string, id: string | null = null) => { calculable = false; add('REFERENCE_DATA_MISSING', message, id); };
  if (!vehicle) invalidReference('Vehicle does not exist.', plan.vehicleId);
  if (!data.operatingDay) invalidReference('Operating calendar entry is missing.', plan.date);
  else if (!data.operatingDay.operating) add('NON_OPERATING_DATE', 'Selected date is not operating.', plan.date, 'date');
  if (vehicle) {
    if (!vehicle.available || data.availability?.available === false) add('VEHICLE_UNAVAILABLE', 'Vehicle is unavailable on this date.', vehicle.id);
    if (vehicle.depotId !== plan.depotId) add('DEPOT_MISMATCH', 'Vehicle belongs to another depot.', vehicle.id);
    if (vehicle.drivers.length !== 1) add('DRIVER_NOT_CONFIGURED', 'Configure exactly one active driver for this vehicle.', vehicle.id);
    if (![vehicle.kmPerL, vehicle.weightCapKg, vehicle.volumeCapM3, vehicle.weeklyFuelQuotaL].every(Number.isFinite) || vehicle.kmPerL <= 0 || vehicle.weightCapKg <= 0 || vehicle.volumeCapM3 <= 0 || vehicle.weeklyFuelQuotaL < 0) invalidReference('Invalid vehicle capacities or fuel configuration.', vehicle.id);
  }
  const orders = plan.orderIds.map(id => data.orders.find(o => o.id === id));
  let weight = 0, volume = 0;
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!order) { invalidReference('Order does not exist.', plan.orderIds[i]); continue; }
    const own = order.stops.find(s => s.active && s.tripId === replacingTripId);
    if (order.stops.some(s => s.active && s.tripId !== replacingTripId)) add('DUPLICATE_ASSIGNMENT', 'Order already has an active assignment.', order.id);
    if ((!own && !['CONFIRMED', 'DEFERRED'].includes(order.status)) || order.recoveryPending) add('ORDER_NOT_ELIGIBLE', 'Order is not available for initial allocation; unresolved recovery must be reconciled first.', order.id);
    const earliest = order.deferredToDate ?? order.plannedDate ?? order.requestedDate;
    if (plan.date < earliest.toISOString().slice(0, 10)) add('ORDER_NOT_ELIGIBLE', 'Cannot allocate before the eligible delivery date.', order.id);
    if (order.outlet.depotId !== plan.depotId) add('DEPOT_MISMATCH', 'Outlet belongs to another depot.', order.id);
    if (vehicle && order.temp !== 'AMBIENT' && vehicle.temp !== 'REEFER') add('REEFER_REQUIRED', 'Chilled/frozen orders require a reefer.', order.id);
    if (vehicle && order.outlet.parkingConstraint === 'VAN_ONLY' && vehicle.type !== 'VAN') add('VAN_REQUIRED', 'Outlet requires a van.', order.id);
    if (!order.lines.length || order.lines.some(l => !Number.isInteger(l.requestedQty) || l.requestedQty <= 0)) invalidReference('Order has no valid requested quantities.', order.id);
    // Until cancellation/recovery handlers supply load factors, never silently reallocate reduced orders at original quantities.
    if (order.lines.some(l => l.cancelledQty > 0) && !own) add('ORDER_NOT_ELIGIBLE', 'A cancelled/recovery balance requires an authorized quantity plan.', order.id);
    if (![order.weightKg, order.volumeM3].every(x => Number.isFinite(x) && x >= 0)) invalidReference('Order weight or volume is invalid.', order.id);
    weight += order.weightKg; volume += order.volumeM3;
  }
  if (vehicle && weight > vehicle.weightCapKg) add('WEIGHT_EXCEEDED', 'Load exceeds weight capacity.', vehicle.id, 'vehicleId', weight, vehicle.weightCapKg);
  if (vehicle && volume > vehicle.volumeCapM3) add('VOLUME_EXCEEDED', 'Load exceeds volume capacity.', vehicle.id, 'vehicleId', volume, vehicle.volumeCapM3);
  const trips = data.trips.filter(t => !t.releasedAt && t.id !== replacingTripId);
  const sameDay = trips.filter(t => t.date.toISOString().slice(0, 10) === plan.date);
  if (sameDay.length >= 2) add('TRIP_LIMIT', 'Vehicle already has two routes on this date.', vehicle?.id ?? null);
  const start = localInstant(plan.date, plan.plannedDeparture);
  let clock = start.getTime(), distance = 0;
  const stops: ValidatePlanResponse['stops'] = [];
  let previous = `depot:${plan.depotId}`;
  const travel = (to: string) => {
    if (previous === to) return;
    const leg = data.legs.find(l => l.fromKey === previous && l.toKey === to);
    if (!leg || ![leg.distanceKm, leg.durationMin].every(x => Number.isFinite(x) && x >= 0)) invalidReference(`Missing or invalid travel leg ${previous} → ${to}.`);
    else { distance += leg.distanceKm; clock += leg.durationMin * 60000; }
    previous = to;
  };
  for (const order of orders) {
    if (!order) continue;
    travel(`outlet:${order.outletId}`);
    const arrival = clock;
    const out = order.outlet;
    const validTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
    if (!validTime(out.windowOpenTime) || !validTime(out.windowCloseTime)) { invalidReference('Invalid receiving window.', out.id); continue; }
    let open = localInstant(plan.date, out.windowOpenTime).getTime();
    let close = localInstant(plan.date, out.windowCloseTime).getTime();
    if (out.mallWindow) {
      const [a, b, extra] = out.mallWindow.split('-');
      if (!a || !b || extra || !validTime(a) || !validTime(b)) invalidReference('Invalid mall window.', out.id);
      else { open = Math.max(open, localInstant(plan.date, a).getTime()); close = Math.min(close, localInstant(plan.date, b).getTime()); }
    }
    clock = Math.max(clock, open);
    if (open > close || clock > close) add('WINDOW_CONFLICT', 'Cannot begin service inside receiving/mall window.', order.id);
    if (out.brand === 'FRESH' && arrival >= localInstant(plan.date, '08:00').getTime()) add('FRESH_DEADLINE', 'Fresh arrival must be strictly before 08:00.', order.id);
    const handling = data.handling.find(h => h.outletId === out.id);
    const serviceStart = clock;
    if (!handling || !Number.isFinite(handling.serviceMin) || handling.serviceMin < 0) invalidReference('Missing or invalid handling estimate.', out.id);
    else clock += handling.serviceMin * 60000;
    stops.push({ orderId: order.id, sequence: stops.length + 1, arrivalAt: new Date(arrival).toISOString(), serviceStartAt: new Date(serviceStart).toISOString(), departureAt: new Date(clock).toISOString() });
  }
  travel(`depot:${plan.depotId}`);
  for (const trip of trips) {
    if (!trip.plannedDepartureAt || !trip.plannedReturnAt || !trip.fuelWeekStart) invalidReference('Existing trip requires timing/fuel backfill before this vehicle can be replanned.', trip.id);
    else if (start < trip.plannedReturnAt && clock > trip.plannedDepartureAt.getTime()) add('VEHICLE_CONFLICT', 'Vehicle trip times overlap, including return travel.', trip.id);
  }
  const fuel = vehicle && vehicle.kmPerL > 0 ? distance / vehicle.kmPerL : 0;
  const week = weekStart(plan.date).getTime();
  const used = trips.filter(t => t.fuelWeekStart?.getTime() === week).reduce((sum, t) => sum + t.reservedFuelL + t.committedFuelL, 0);
  const remaining = (vehicle?.weeklyFuelQuotaL ?? 0) - used;
  if (fuel > remaining) add('FUEL_QUOTA_EXCEEDED', 'Route including return exceeds remaining weekly fuel.', vehicle?.id ?? null, 'vehicleId', fuel, remaining);
  const totals = calculable ? { weightKg: weight, volumeM3: volume, distanceKm: distance, estimatedFuelL: fuel, durationMin: (clock - start.getTime()) / 60000, remainingWeeklyFuelL: remaining - fuel, existingTripsOnDate: sameDay.length } : null;
  const base = { evaluatedAt: now.toISOString(), totals, stops: calculable ? stops : [] };
  return reasons.length ? { ...base, valid: false, reasons: reasons as [PlanningReason, ...PlanningReason[]] } : { ...base, valid: true, totals: totals!, reasons: [] };
}
