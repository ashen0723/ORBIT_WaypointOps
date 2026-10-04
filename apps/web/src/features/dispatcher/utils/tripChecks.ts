import type { Depot, Order, Vehicle } from '../types/dispatch';
import { FIRST_DEPARTURE, FRESH_WINDOW, FUEL_BASE_L, FUEL_PER_STOP_L, MAX_TRIPS_PER_VEHICLE, MINUTES_PER_STOP, SECOND_DEPARTURE, TRIP_BASE_MIN } from '../data/dispatcher';
import { fromMin, to12h, toMin } from './time';
import { formatNumber, storeName } from './format';
import { BRAND_NEEDS, COLD_RANK } from './vehicle';

export type CheckGroup = 'capacity' | 'vehicle' | 'window' | 'depot' | 'time' | 'fuel';

export interface TripIssue {
  key: string;
  group: CheckGroup;
  title: string;
  message: string;
  fix: string;
}

export interface PlannedStop {
  order: Order;
  eta: string;
}

export interface TripFeasibility {
  estimatedMin: number;
  availableMin: number;
  fitsTime: boolean;
  fuelRequiredL: number;
  fuelAvailableL: number;
  fitsFuel: boolean;
  /** Present when the trip carries Fresh orders. */
  fresh: {lastEta: string;late: boolean;} | null;
}

export interface TripCheckResult {
  issues: TripIssue[];
  passed: Record<CheckGroup, boolean>;
  depart: string;
  stops: PlannedStop[];
  feasibility: TripFeasibility;
}

export function estimateTripMin(stopCount: number): number {
  return stopCount === 0 ? 0 : TRIP_BASE_MIN + MINUTES_PER_STOP * stopCount;
}

export function estimateFuelL(stopCount: number): number {
  return stopCount === 0 ? 0 : FUEL_BASE_L + FUEL_PER_STOP_L * stopCount;
}

export function planStops(orders: Order[], tripsUsed: number): {depart: string;stops: PlannedStop[];} {
  const depart = tripsUsed === 0 ? FIRST_DEPARTURE : SECOND_DEPARTURE;
  const sorted = [...orders].sort((a, b) => toMin(a.windowEnd) - toMin(b.windowEnd));
  return {
    depart,
    stops: sorted.map((order, i) => ({ order, eta: fromMin(toMin(depart) + MINUTES_PER_STOP * (i + 1)) }))
  };
}

export function freshCheck(stops: PlannedStop[]): TripFeasibility['fresh'] {
  const fresh = stops.filter((s) => s.order.brand === 'Fresh');
  if (!fresh.length) return null;
  const lastEta = fresh[fresh.length - 1].eta;
  return { lastEta, late: toMin(lastEta) > toMin(FRESH_WINDOW.end) };
}

export function checkTrip(orders: Order[], vehicle: Vehicle, tripsUsed: number, depot: Depot): TripCheckResult {
  const issues: TripIssue[] = [];

  if (vehicle.unavailableReason) {
    issues.push({ key: 'unavailable', group: 'vehicle', title: 'Vehicle unavailable', message: `${vehicle.id} is ${vehicle.unavailableReason.toLowerCase()} today.`, fix: 'Choose another vehicle.' });
  } else if (tripsUsed >= MAX_TRIPS_PER_VEHICLE) {
    issues.push({ key: 'limit', group: 'vehicle', title: 'Trip limit reached', message: `This vehicle already has ${MAX_TRIPS_PER_VEHICLE} trips today.`, fix: 'Choose another vehicle.' });
  }

  if (vehicle.depot !== depot) {
    issues.push({ key: 'depot', group: 'depot', title: 'Wrong depot', message: `${vehicle.id} is based at ${vehicle.depot}. This trip leaves ${depot}.`, fix: `Choose a ${depot} vehicle.` });
  }

  const frozen = orders.filter((o) => BRAND_NEEDS[o.brand] === 'frozen');
  const chilled = orders.filter((o) => BRAND_NEEDS[o.brand] === 'chilled');
  if (frozen.length && COLD_RANK[vehicle.cold] < COLD_RANK.frozen) {
    issues.push({ key: 'frozen', group: 'vehicle', title: 'Vehicle not suitable', message: frozen.length === 1 ? 'This order must stay frozen.' : 'These orders must stay frozen.', fix: 'Choose a freezer truck.' });
  } else if (chilled.length && COLD_RANK[vehicle.cold] < COLD_RANK.chilled) {
    issues.push({ key: 'chilled', group: 'vehicle', title: 'Vehicle not suitable', message: chilled.length === 1 ? 'This order requires refrigeration.' : 'These orders require refrigeration.', fix: 'Choose a refrigerated vehicle.' });
  }

  const vanOnly = orders.find((o) => o.requiresVan);
  if (vanOnly && !vehicle.isVan) {
    issues.push({ key: 'van', group: 'vehicle', title: 'Wrong vehicle type', message: `${storeName(vanOnly)} requires a van.`, fix: 'Choose a van, or remove this order.' });
  }

  const weight = orders.reduce((s, o) => s + o.weightKg, 0);
  const volume = orders.reduce((s, o) => s + o.volumeM3, 0);
  const overKg = weight - vehicle.weightKg;
  const overM3 = volume - vehicle.volumeM3;
  if (overKg > 0 || overM3 > 0) {
    const parts = [overKg > 0 ? `${formatNumber(overKg)} kg` : null, overM3 > 0 ? `${formatNumber(overM3)} m³` : null].filter(Boolean).join(' and ');
    issues.push({ key: 'capacity', group: 'capacity', title: 'Capacity exceeded', message: `This trip is ${parts} over the vehicle limit.`, fix: 'Remove an order or choose a bigger vehicle. Orders can’t be split.' });
  }

  const plan = planStops(orders, tripsUsed);
  const late = plan.stops.find((s) => toMin(s.eta) > toMin(s.order.windowEnd));
  if (late) {
    issues.push({
      key: 'window',
      group: 'window',
      title: 'Delivery time conflict',
      message: `This trip can’t reach ${storeName(late.order)} by ${to12h(late.order.windowEnd)}.`,
      fix: tripsUsed > 0 ? `This is the vehicle’s 2nd trip, so it leaves at ${to12h(plan.depart)}. Choose a vehicle with no trips yet.` : 'Remove an order or move it to another trip.'
    });
  }

  const feasibility: TripFeasibility = {
    estimatedMin: estimateTripMin(orders.length),
    availableMin: vehicle.availableMin,
    fitsTime: estimateTripMin(orders.length) <= vehicle.availableMin,
    fuelRequiredL: estimateFuelL(orders.length),
    fuelAvailableL: vehicle.fuelL,
    fitsFuel: estimateFuelL(orders.length) <= vehicle.fuelL,
    fresh: freshCheck(plan.stops)
  };

  // Time and fuel only matter once the vehicle itself can run today.
  if (!vehicle.unavailableReason) {
    if (!feasibility.fitsTime) {
      issues.push({
        key: 'time',
        group: 'time',
        title: 'Time Limit Exceeded',
        message: 'This trip cannot be completed within the available operating time.',
        fix: `It needs ${feasibility.estimatedMin} min; ${vehicle.id} has ${feasibility.availableMin} min left. Remove an order to shorten it.`
      });
    }
    if (!feasibility.fitsFuel) {
      issues.push({
        key: 'fuel',
        group: 'fuel',
        title: 'Insufficient Fuel',
        message: 'This trip requires more fuel than the available quota.',
        fix: `It needs ${feasibility.fuelRequiredL} L; ${vehicle.id} has ${feasibility.fuelAvailableL} L. Choose another vehicle.`
      });
    }
  }

  const has = (g: CheckGroup) => issues.some((i) => i.group === g);
  return {
    issues,
    passed: { capacity: !has('capacity'), vehicle: !has('vehicle'), window: !has('window'), depot: !has('depot'), time: !has('time'), fuel: !has('fuel') },
    depart: plan.depart,
    stops: plan.stops,
    feasibility
  };
}