import type { Brand, CalendarDay, Depot, DepotId, Driver, Order, Outlet, Temperature, Trip, Vehicle } from '../types/dispatch';
import { MAX_TRIPS_PER_VEHICLE_PER_DAY } from '../data/rules';
import { closureNote, isOperatingDay } from './calendar';
import { addDays } from './clock';
import { formatNumber, plural } from './format';
import { TEMPERATURE_LABEL, temperatureCompatible } from './vehicle';

/**
 * Deterministic capacity estimate (no ML). For each date × depot:
 *  1. Demand = open orders planned for that date (pending + allocated), grouped by temperature, split by brand.
 *  2. Supply = vehicles not marked unavailable. Each refrigerated/freezer vehicle offers one Fresh-window trip
 *     (the 8 AM deadline leaves no time for a second); ambient work gets up to two trips per vehicle.
 *  3. Groups are served frozen → chilled → ambient, largest vehicles first, each vehicle-trip used once.
 *     Van-only demand is served by vans first.
 *  4. Drivers needed = distinct vehicles used; compared with drivers based at the depot.
 */

export interface BrandDemand {
  orders: number;
  kg: number;
  m3: number;
}

export interface ForecastGroup {
  temperature: Temperature;
  orders: number;
  kg: number;
  m3: number;
  byBrand: Record<Brand, BrandDemand>;
  tripsNeeded: number;
  coveredKg: number;
  coveredM3: number;
  shortKg: number;
  shortM3: number;
  vehiclesUsed: string[];
}

export interface DepotForecast {
  depotId: DepotId;
  depotName: string;
  operating: boolean;
  closure: string;
  orders: number;
  groups: ForecastGroup[];
  vehiclesAvailable: number;
  vehiclesOut: {id: string;reason: string;}[];
  vehiclesNeeded: number;
  driversAvailable: number;
  driversNeeded: number;
  shortage: boolean;
  explanations: string[];
}

export interface ForecastDay {
  date: string;
  depots: DepotForecast[];
}

interface Source {
  orders: Order[];
  vehicles: Vehicle[];
  drivers: Driver[];
  depots: Depot[];
  outlets: Outlet[];
  calendar: CalendarDay[];
  trips: Trip[];
}

const TEMPS: Temperature[] = ['frozen', 'chilled', 'ambient'];
const BRANDS: Brand[] = ['Fresh', 'Style', 'Tech'];

export function buildForecast(src: Source, fromDate: string, days: number): ForecastDay[] {
  return Array.from({ length: days }, (_, i) => addDays(fromDate, i)).map((date) => ({
    date,
    depots: src.depots.map((d) => depotForecast(src, d, date))
  }));
}

function depotForecast(src: Source, depot: Depot, date: string): DepotForecast {
  const operating = isOperatingDay(src.calendar, date, depot.id);
  const demand = src.orders.filter((o) => o.depotId === depot.id && o.plannedDate === date && (o.status === 'pending' || o.status === 'allocated'));
  const fleet = src.vehicles.filter((v) => v.depotId === depot.id);
  const vehiclesOut = fleet.flatMap((v) => v.unavailable.filter((u) => u.date === date).map((u) => ({ id: v.id, reason: u.reason })));
  const available = fleet.filter((v) => !vehiclesOut.some((x) => x.id === v.id));
  const vanOnlyOutlets = new Set(src.outlets.filter((o) => o.vanOnly).map((o) => o.id));

  // Remaining vehicle-trip slots.
  const slots = new Map<string, number>(available.map((v) => [v.id, v.refrigeration === 'ambient' ? MAX_TRIPS_PER_VEHICLE_PER_DAY : 1]));
  const used = new Set<string>();
  const explanations: string[] = [];

  const groups: ForecastGroup[] = TEMPS.map((temperature) => {
    const list = demand.filter((o) => o.temperature === temperature);
    const byBrand = Object.fromEntries(BRANDS.map((b) => [b, { orders: 0, kg: 0, m3: 0 }])) as Record<Brand, BrandDemand>;
    list.forEach((o) => {
      byBrand[o.brand].orders += 1;
      byBrand[o.brand].kg += o.weightKg;
      byBrand[o.brand].m3 += o.volumeM3;
    });
    const g: ForecastGroup = { temperature, orders: list.length, kg: sum(list, 'weightKg'), m3: sum(list, 'volumeM3'), byBrand, tripsNeeded: 0, coveredKg: 0, coveredM3: 0, shortKg: 0, shortM3: 0, vehiclesUsed: [] };
    if (!list.length || !operating) return g;

    const parts: {orders: Order[];vansOnly: boolean;}[] = [
    { orders: list.filter((o) => vanOnlyOutlets.has(o.outletId)), vansOnly: true },
    { orders: list.filter((o) => !vanOnlyOutlets.has(o.outletId)), vansOnly: false }];

    parts.forEach(({ orders, vansOnly }) => {
      let needKg = sum(orders, 'weightKg');
      let needM3 = sum(orders, 'volumeM3');
      if (!orders.length) return;
      const pool = available.filter((v) => temperatureCompatible(v.refrigeration, temperature) && (!vansOnly || v.isVan)).sort((a, b) => b.capacityKg - a.capacityKg);
      for (const v of pool) {
        while ((slots.get(v.id) ?? 0) > 0 && (needKg > 0 || needM3 > 0)) {
          slots.set(v.id, (slots.get(v.id) ?? 0) - 1);
          needKg -= v.capacityKg;
          needM3 -= v.capacityM3;
          g.tripsNeeded += 1;
          used.add(v.id);
          if (!g.vehiclesUsed.includes(v.id)) g.vehiclesUsed.push(v.id);
        }
        if (needKg <= 0 && needM3 <= 0) break;
      }
      g.shortKg += Math.max(0, needKg);
      g.shortM3 += Math.max(0, needM3);
      if (needKg > 0 || needM3 > 0) {
        const kind = vansOnly ? `${TEMPERATURE_LABEL[temperature].toLowerCase()} van` : temperature === 'frozen' ? 'freezer truck' : temperature === 'chilled' ? 'refrigerated vehicle' : 'ambient vehicle';
        const typical = pool[0] ?? fleet.find((v) => temperatureCompatible(v.refrigeration, temperature) && (!vansOnly || v.isVan));
        const extra = typical ? Math.max(Math.ceil(Math.max(0, needKg) / typical.capacityKg), Math.ceil(Math.max(0, needM3) / typical.capacityM3)) : 1;
        explanations.push(
          `${TEMPERATURE_LABEL[temperature]}${vansOnly ? ' (van-only stores)' : ''}: short by ${formatNumber(Math.max(0, needKg))} kg / ${formatNumber(Math.max(0, needM3))} m³. ${
          pool.length ? `All ${plural(pool.length, `suitable ${kind}`)} are fully used.` : `No suitable ${kind} is available.`} Add ${
          plural(extra, `more ${kind}`, `more ${kind}s`)} or defer ${vansOnly ? 'van-only' : TEMPERATURE_LABEL[temperature].toLowerCase()} orders.`
        );
      }
    });
    g.coveredKg = Math.max(0, g.kg - g.shortKg);
    g.coveredM3 = Math.max(0, g.m3 - g.shortM3);
    return g;
  });

  const driversAvailable = src.drivers.filter((d) => d.depotId === depot.id).length;
  const driversNeeded = used.size;
  if (driversNeeded > driversAvailable) explanations.push(`Needs ${driversNeeded} drivers but only ${driversAvailable} are based at ${depot.name}.`);
  if (!operating && demand.length) explanations.push(`${plural(demand.length, 'order')} planned on a closed day — reschedule them.`);
  vehiclesOut.forEach((v) => {
    if (explanations.length) explanations.push(`${v.id} is out (${v.reason}); bringing it back would add capacity.`);
  });

  return {
    depotId: depot.id,
    depotName: depot.name,
    operating,
    closure: closureNote(src.calendar, date, depot.id),
    orders: demand.length,
    groups,
    vehiclesAvailable: available.length,
    vehiclesOut,
    vehiclesNeeded: used.size,
    driversAvailable,
    driversNeeded,
    shortage: groups.some((g) => g.shortKg > 0 || g.shortM3 > 0) || driversNeeded > driversAvailable || !operating && demand.length > 0,
    explanations
  };
}

function sum(list: Order[], key: 'weightKg' | 'volumeM3'): number {
  return Math.round(list.reduce((s, o) => s + o[key], 0) * 10) / 10;
}