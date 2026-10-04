import type { DB, Snapshot, User } from '../types/dispatch';
import { addDays, colomboParts } from '../utils/clock';
import { publicUser } from './support';

/**
 * Read permissions. Each role receives only the records it may see; nothing restricted is sent to the
 * client and then hidden in the UI.
 */
export function buildSnapshot(db: DB, user: User, now: string): Snapshot {
  const base = { user: publicUser(user), serverTime: now, depots: db.depots, calendar: db.calendar };
  const recentFrom = addDays(colomboParts(now).date, -3);

  if (user.role === 'dispatcher') {
    return { ...base, outlets: db.outlets, vehicles: db.vehicles, drivers: db.drivers, orders: db.orders, trips: db.trips, deferrals: db.deferrals, events: db.events.slice(0, 600) };
  }

  if (user.role === 'store_manager') {
    const orders = db.orders.filter((o) => o.outletId === user.outletId);
    const ids = new Set(orders.map((o) => o.id));
    const trips = db.trips.
    filter((t) => t.stops.some((s) => ids.has(s.orderId))).
    map((t) => ({ ...t, stops: t.stops.filter((s) => ids.has(s.orderId)), load: t.load.filter((l) => ids.has(l.orderId)) }));
    const vehicleIds = new Set(trips.map((t) => t.vehicleId));
    const driverIds = new Set(trips.map((t) => t.driverId));
    return {
      ...base,
      outlets: db.outlets.filter((o) => o.id === user.outletId),
      vehicles: db.vehicles.filter((v) => vehicleIds.has(v.id)),
      drivers: db.drivers.filter((d) => driverIds.has(d.id)),
      orders,
      trips,
      deferrals: db.deferrals.filter((d) => d.outletId === user.outletId),
      events: db.events.filter((e) => e.outletId === user.outletId).slice(0, 300)
    };
  }

  const trips =
  user.role === 'loader' ?
  db.trips.filter((t) => t.depotId === user.depotId && t.date >= recentFrom) :
  db.trips.filter((t) => t.driverId === user.driverId && t.date >= recentFrom);
  const tripIds = new Set(trips.map((t) => t.id));
  const orderIds = new Set(trips.flatMap((t) => t.stops.map((s) => s.orderId)));
  const outletIds = new Set(trips.flatMap((t) => t.stops.map((s) => s.outletId)));
  const vehicleIds = new Set(trips.map((t) => t.vehicleId));
  const driverIds = new Set(trips.map((t) => t.driverId));
  return {
    ...base,
    outlets: db.outlets.filter((o) => outletIds.has(o.id)),
    vehicles: db.vehicles.filter((v) => vehicleIds.has(v.id)),
    drivers: db.drivers.filter((d) => driverIds.has(d.id)),
    orders: db.orders.filter((o) => orderIds.has(o.id)),
    trips,
    deferrals: db.deferrals.filter((d) => orderIds.has(d.orderId)),
    events: db.events.filter((e) => e.tripId && tripIds.has(e.tripId)).slice(0, 300)
  };
}