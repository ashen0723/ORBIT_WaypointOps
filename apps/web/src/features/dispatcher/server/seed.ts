import type { Brand, CalendarDay, DB, DepotId, Order, Temperature, Trip, User } from '../types/dispatch';
import { depots } from '../data/depots';
import { outlets } from '../data/outlets';
import { drivers } from '../data/drivers';
import { vehicles as fleet } from '../data/vehicles';
import { demoAccounts } from '../data/users';
import { DEMO_PASSWORD } from '../data/rules';
import { hashPassword } from '../utils/crypto';
import { addDays, colomboParts, colomboToIso } from '../utils/clock';
import { isOperatingDay, nextOperatingDay } from '../utils/calendar';
import { materializeTrip, validateTrip, type TripProposal } from '../utils/tripValidation';
import { applyFieldAction, type FieldAction } from '../utils/fieldOps';
import { fromMin, toMin } from '../utils/time';

export const SCHEMA = 3;

/**
 * Builds the demonstration database relative to the moment it is first created, so every record
 * carries a real date instead of "Today"/"Tomorrow" labels. Official datasets were not supplied;
 * all reference data is labelled demo data in README.md.
 */
export function createSeedDb(now: Date): DB {
  const nowIso = now.toISOString();
  const today = colomboParts(now).date;

  const calendar: CalendarDay[] = [];
  let holiday = addDays(today, 6);
  while (new Date(`${holiday}T00:00:00Z`).getUTCDay() === 0) holiday = addDays(holiday, 1);
  calendar.push({ date: holiday, depotId: 'ALL', operating: false, note: 'Public holiday (demo placeholder — replace with the official calendar)' });

  const op = (d: string, depot: DepotId = 'DEP-PLG') => isOperatingDay(calendar, d, depot);
  const prevOp = (d: string) => {
    let x = addDays(d, -1);
    while (!op(x)) x = addDays(x, -1);
    return x;
  };
  const C = op(today) ? today : nextOperatingDay(calendar, 'DEP-PLG', today);
  const P = nextOperatingDay(calendar, 'DEP-PLG', C);
  const P1 = nextOperatingDay(calendar, 'DEP-PLG', P);
  const H1 = prevOp(C);
  calendar.push({ date: nextOperatingDay(calendar, 'DEP-KDY', P1), depotId: 'DEP-KDY', operating: false, note: 'Kandy depot stocktake (demo)' });

  const users: User[] = demoAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    passwordHash: hashPassword(a.email, DEMO_PASSWORD),
    outletId: a.outletId,
    depotId: a.depotId,
    driverId: a.driverId
  }));
  const dispatcher = users.find((u) => u.role === 'dispatcher') as User;
  const loader = users.find((u) => u.role === 'loader') as User;
  const store = users.find((u) => u.id === 'USR-STR') as User;

  const vehicles = fleet.map((v) => ({ ...v, unavailable: [...v.unavailable] }));
  const markOut = (id: string, date: string, reason: string) => vehicles.find((v) => v.id === id)?.unavailable.push({ date, reason });
  [C, P, P1].forEach((d) => markOut('TRK-024', d, 'In maintenance'));
  markOut('VAN-007', P1, 'Driver on leave');

  const db: DB = {
    schema: SCHEMA,
    seededAt: nowIso,
    depots,
    outlets,
    vehicles,
    drivers,
    calendar,
    users,
    orders: [],
    trips: [],
    deferrals: [],
    events: [],
    sessions: [],
    processedOps: {},
    counters: { order: 1000, trip: 0, event: 0 }
  };

  const ev = (type: DB['events'][number]['type'], at: string, actor: User | null, message: string, refs: {orderId?: string;tripId?: string;outletId?: string;depotId?: DepotId;} = {}) => {
    db.counters.event += 1;
    db.events.push({ id: `EVT-${db.counters.event}`, type, at, actorId: actor?.id ?? 'system', actorName: actor?.name ?? 'System', message, ...refs });
  };

  const mk = (outletId: string, brand: Brand, temperature: Temperature, date: string, units: number, weightKg: number, volumeM3: number, requestedDate = date): Order => {
    const outlet = outlets.find((o) => o.id === outletId);
    if (!outlet) throw new Error(`Seed outlet ${outletId} missing`);
    db.counters.order += 1;
    const candidate = colomboToIso(addDays(requestedDate, -1), '11:00');
    const createdAt = candidate < nowIso ? candidate : new Date(now.getTime() - 30 * 60000).toISOString();
    const order: Order = {
      id: `ORD-${db.counters.order}`,
      outletId,
      depotId: outlet.depotId,
      brand,
      temperature,
      requestedDate,
      plannedDate: date,
      createdAt,
      createdBy: outletId === 'OUT-001' ? store.id : 'store-import',
      units,
      weightKg,
      volumeM3,
      windowStart: outlet.windowStart,
      windowEnd: outlet.windowEnd,
      status: 'pending',
      currentTripId: null,
      attempts: [],
      deferralCount: 0,
      note: '',
      deliveredUnits: null,
      receipt: null
    };
    db.orders.push(order);
    ev('order_created', createdAt, outletId === 'OUT-001' ? store : null, `${order.id} placed: ${brand} ${temperature}, ${units} units for ${requestedDate}`, { orderId: order.id, outletId, depotId: outlet.depotId });
    return order;
  };

  const seedTrip = (date: string, vehicleId: string, orders: Order[]): Trip => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const proposal: TripProposal = { date, depotId: vehicle?.depotId ?? 'DEP-PLG', orderIds: orders.map((o) => o.id), vehicleId, driverId: null };
    const v = validateTrip({ orders: db.orders, trips: db.trips, vehicles, drivers, outlets, depots, calendar }, proposal);
    db.counters.trip += 1;
    const createdAt = colomboToIso(addDays(date, -1), '17:30') < nowIso ? colomboToIso(addDays(date, -1), '17:30') : nowIso;
    const trip = materializeTrip(v, proposal, { id: `TRP-${String(db.counters.trip).padStart(3, '0')}`, number: db.counters.trip, createdBy: dispatcher.id, createdAt });
    db.trips.push(trip);
    orders.forEach((o) => {
      o.status = 'allocated';
      o.currentTripId = trip.id;
      o.attempts.push(trip.id);
    });
    ev('trip_confirmed', createdAt, dispatcher, `Trip ${trip.number} confirmed on ${vehicleId} for ${date}`, { tripId: trip.id, depotId: trip.depotId });
    return trip;
  };

  const apply = (trip: Trip, action: FieldAction, actorName: string, time: string) => {
    const next = applyFieldAction(trip, action, actorName, colomboToIso(trip.date, time));
    Object.assign(trip, next);
  };
  const plus = (t: string, m: number) => fromMin(toMin(t) + m);

  const loadAll = (trip: Trip) => {
    trip.load.forEach((l) => apply(trip, { type: 'recordLoad', tripId: trip.id, orderId: l.orderId, loadedUnits: l.expectedUnits, damagedUnits: 0, reason: '' }, loader.name, plus(trip.departAt, -10)));
    apply(trip, { type: 'depart', tripId: trip.id }, loader.name, trip.departAt);
    trip.stops.forEach((s) => {
      const o = db.orders.find((x) => x.id === s.orderId);
      if (o) o.status = 'in_transit';
    });
    ev('trip_departed', colomboToIso(trip.date, trip.departAt), loader, `Trip ${trip.number} departed`, { tripId: trip.id, depotId: trip.depotId });
  };

  const deliver = (trip: Trip, orderId: string, units: number, recipient: string, damaged = 0, note = '') => {
    const stop = trip.stops.find((s) => s.orderId === orderId);
    if (!stop) return;
    const driverName = drivers.find((d) => d.id === trip.driverId)?.name ?? 'Driver';
    const at = plus(stop.plannedArrival, 4);
    apply(trip, { type: 'arrive', tripId: trip.id, orderId }, driverName, at);
    apply(trip, { type: 'deliver', tripId: trip.id, orderId, deliveredUnits: units, damagedUnits: damaged, note, pod: { recipientName: recipient, signature: '', note: 'Signature captured on legacy paper form (seed record)', capturedAt: colomboToIso(trip.date, plus(at, 12)) } }, driverName, plus(at, 12));
    const o = db.orders.find((x) => x.id === orderId);
    if (o) {
      o.deliveredUnits = units;
      o.status = units < o.units ? 'partially_delivered' : 'delivered';
    }
    ev('stop_delivered', colomboToIso(trip.date, plus(at, 12)), null, `${orderId} delivered (${units} units) — signed by ${recipient}`, { orderId, tripId: trip.id, outletId: stop.outletId, depotId: trip.depotId });
  };

  // ── History: previous operating day ───────────────────────────────
  const h1a = mk('OUT-001', 'Fresh', 'chilled', H1, 20, 180, 2.8);
  const h1b = mk('OUT-011', 'Fresh', 'chilled', H1, 18, 200, 3);
  const h1c = mk('OUT-008', 'Tech', 'ambient', H1, 40, 520, 8);
  const h1d = mk('OUT-012', 'Style', 'ambient', H1, 18, 220, 3.5);
  const t1 = seedTrip(H1, 'TRK-021', [h1a]);
  const t2 = seedTrip(H1, 'VAN-012', [h1b]);
  const t3 = seedTrip(H1, 'TRK-030', [h1c, h1d]);
  [t1, t2, t3].forEach(loadAll);
  deliver(t1, h1a.id, 20, 'R. Gunasekara');
  deliver(t2, h1b.id, 18, 'M. Fernando');
  deliver(t3, h1d.id, 18, 'A. Perera');
  deliver(t3, h1c.id, 38, 'S. Dias', 2, '2 cartons missing on arrival, 2 crushed');
  h1a.receipt = { receivedUnits: 20, damagedUnits: 0, missingUnits: 0, note: '', confirmedAt: colomboToIso(H1, '07:10'), confirmedBy: store.id };
  ev('receipt_confirmed', colomboToIso(H1, '07:10'), store, `${h1a.id} receipt confirmed: 20 received`, { orderId: h1a.id, outletId: 'OUT-001', depotId: 'DEP-PLG' });

  // ── Current operating day ─────────────────────────────────────────
  const c1 = mk('OUT-002', 'Fresh', 'chilled', C, 22, 210, 3.5);
  const c2 = mk('OUT-003', 'Fresh', 'chilled', C, 18, 180, 3);
  const c3 = mk('OUT-010', 'Fresh', 'chilled', C, 24, 240, 4);
  const c4 = mk('OUT-007', 'Fresh', 'frozen', C, 18, 260, 4);
  const c5 = mk('OUT-004', 'Fresh', 'frozen', C, 20, 300, 4.5);
  const c6 = mk('OUT-006', 'Fresh', 'frozen', C, 22, 320, 4.8);
  const c7 = mk('OUT-008', 'Tech', 'ambient', C, 36, 450, 7);
  const c8 = mk('OUT-012', 'Style', 'ambient', C, 25, 300, 4.5);
  const c9 = mk('OUT-013', 'Tech', 'ambient', C, 30, 420, 6.5);

  const t4 = seedTrip(C, 'TRK-018', [c1, c2, c3]);
  loadAll(t4);
  deliver(t4, c1.id, 22, 'K. Wijesinghe');
  deliver(t4, c2.id, 18, 'P. Rodrigo');

  const t5 = seedTrip(C, 'TRK-015', [c4, c5, c6]);
  loadAll(t5);
  deliver(t5, c4.id, 18, 'L. Ekanayake');
  deliver(t5, c5.id, 20, 'D. Samarasinghe');
  const delayed = t5.stops.find((s) => s.orderId === c6.id);
  if (delayed) {
    apply(t5, { type: 'reportDelay', tripId: t5.id, orderId: c6.id, minutes: 35, reason: 'Road closure on High Level Rd — detour via Kirulapone' }, 'Ruwan Jayasinghe', plus(delayed.plannedArrival, -15));
    ev('delay_reported', colomboToIso(C, plus(delayed.plannedArrival, -15)), null, `${c6.id}: 35 min delay — road closure`, { orderId: c6.id, tripId: t5.id, outletId: 'OUT-006', depotId: 'DEP-PLG' });
  }

  seedTrip(C, 'TRK-030', [c7, c8, c9]);

  // ── Next operating day — demo driver's trip awaiting loading, plus the planning queue ──
  const n1 = mk('OUT-001', 'Fresh', 'chilled', P, 20, 160, 2.4);
  const n2 = mk('OUT-007', 'Fresh', 'chilled', P, 28, 280, 4.8);
  seedTrip(P, 'TRK-021', [n1, n2]);

  mk('OUT-001', 'Fresh', 'ambient', P, 15, 90, 1.6);
  mk('OUT-002', 'Fresh', 'chilled', P, 34, 340, 5.6);
  mk('OUT-003', 'Fresh', 'chilled', P, 40, 390, 6);
  mk('OUT-010', 'Fresh', 'chilled', P, 22, 210, 3.4);
  mk('OUT-004', 'Fresh', 'frozen', P, 30, 450, 6.5);
  mk('OUT-006', 'Fresh', 'frozen', P, 35, 500, 7);
  mk('OUT-005', 'Style', 'ambient', P, 25, 300, 4.2);
  mk('OUT-008', 'Tech', 'ambient', P, 60, 800, 12);
  mk('OUT-009', 'Tech', 'ambient', P, 36, 450, 7);
  mk('OUT-012', 'Style', 'ambient', P, 18, 220, 3.5);
  mk('OUT-011', 'Fresh', 'chilled', P, 18, 260, 3.8);
  mk('OUT-014', 'Fresh', 'chilled', P, 26, 260, 4.5);
  mk('OUT-015', 'Tech', 'ambient', P, 18, 220, 3.5);

  // Repeatedly deferred order: requested for H1, moved to C, then to P.
  const rep = mk('OUT-013', 'Tech', 'ambient', H1, 40, 700, 10, H1);
  db.deferrals.push(
    { id: 'DEF-SEED-1', kind: 'deferred', orderId: rep.id, outletId: rep.outletId, reason: 'capacity', note: 'Ambient fleet full', fromDate: H1, toDate: C, tripId: null, actorId: dispatcher.id, actorName: dispatcher.name, at: colomboToIso(addDays(H1, -1), '17:40') },
    { id: 'DEF-SEED-2', kind: 'deferred', orderId: rep.id, outletId: rep.outletId, reason: 'no_vehicle', note: 'TRK-024 in maintenance', fromDate: C, toDate: P, tripId: null, actorId: dispatcher.id, actorName: dispatcher.name, at: colomboToIso(addDays(C, -1), '17:45') }
  );
  rep.plannedDate = P;
  rep.deferralCount = 2;

  const once = mk('OUT-016', 'Fresh', 'chilled', C, 24, 280, 4.4, C);
  db.deferrals.push({ id: 'DEF-SEED-3', kind: 'deferred', orderId: once.id, outletId: once.outletId, reason: 'store_closed', note: 'Store closed for refit', fromDate: C, toDate: P, tripId: null, actorId: dispatcher.id, actorName: dispatcher.name, at: colomboToIso(addDays(C, -1), '18:00') });
  once.plannedDate = P;
  once.deferralCount = 1;

  // ── Day after: drives the capacity forecast ──────────────────────
  mk('OUT-001', 'Fresh', 'chilled', P1, 30, 300, 5);
  mk('OUT-002', 'Fresh', 'chilled', P1, 40, 450, 7);
  mk('OUT-003', 'Fresh', 'chilled', P1, 36, 400, 6);
  mk('OUT-007', 'Fresh', 'chilled', P1, 50, 600, 9);
  mk('OUT-010', 'Fresh', 'chilled', P1, 45, 500, 8);
  mk('OUT-011', 'Fresh', 'chilled', P1, 18, 260, 3.8);
  mk('OUT-004', 'Fresh', 'frozen', P1, 40, 700, 10);
  mk('OUT-008', 'Tech', 'ambient', P1, 70, 1200, 18);
  mk('OUT-005', 'Style', 'ambient', P1, 30, 380, 5.5);

  db.events.sort((a, b) => b.at.localeCompare(a.at));
  return db;
}