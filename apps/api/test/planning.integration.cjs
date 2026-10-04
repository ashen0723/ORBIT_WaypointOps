/* Executes real migration SQL and HTTP routes against disposable PostgreSQL WASM.
 * PGlite serializes connections; native PostgreSQL SSI concurrency requires test:postgres below.
 */
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
require('reflect-metadata');

async function main() {
  let database, socket, app, db, admin, schema;
  const native = process.argv.includes('--postgres');
  if (native && !process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL for a native PostgreSQL test database.');
  try {
    if (native) {
      admin = new Client({ connectionString: process.env.TEST_DATABASE_URL });
      await admin.connect();
      schema = `waypoint_test_${randomUUID().replaceAll('-', '')}`;
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await admin.query(`SET search_path TO "${schema}"`);
      database = { exec: sql => admin.query(sql), query: (sql, args) => admin.query(sql, args) };
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    } else database = await PGlite.create();
    for (const migration of ['0001_init', '0002_planning_contract', '0003_decisions_and_rescheduling', '0004_connected_workflow']) {
      console.log(`Applying ${migration}`);
      const sql = (await readFile(join(__dirname, '../prisma/migrations', migration, 'migration.sql'), 'utf8')).replace('CREATE SCHEMA IF NOT EXISTS "public";', '');
      // These migrations contain no procedural bodies; preserve their explicit transaction boundaries.
      for (const statement of sql.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) await database.exec(statement + ';');
      console.log(`Applied ${migration}`);
    }
    if (!native) {
    socket = new PGLiteSocketServer({ db: database, host: '127.0.0.1', port: 0 });
    await Promise.race([socket.start(), new Promise((_, reject) => socket.addEventListener('error', event => reject(event.detail), { once: true }))]);
    process.env.DATABASE_URL = `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`;
    console.log('Test database listening');
    }
    process.env.JWT_SECRET = 'integration-only-secret-with-at-least-32-characters';
    const { AppModule } = require('../dist/app.module');
    const { PrismaService } = require('../dist/prisma/prisma.service');
    const { PrismaClient } = require('../dist/generated/prisma/client');
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: native ? 10 : 1, ...(schema ? { options: `-c search_path=${schema}` } : {}) }, schema ? { schema } : undefined) });
    client.onModuleDestroy = () => client.$disconnect();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(client).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    db = app.get(PrismaService);
    const base = await app.getUrl();
    console.log('Test API listening');
    const day = new Date('2026-10-05');
    await db.depot.createMany({ data: [{ id: 'D', name: 'Depot' }, { id: 'OTHER', name: 'Other depot' }] });
    await db.vehicle.create({ data: { id: 'V', depotId: 'D', type: 'TRUCK', temp: 'REEFER', weightCapKg: 100, volumeCapM3: 10, fuelType: 'diesel', kmPerL: 10, weeklyFuelQuotaL: 25 } });
    await db.outlet.create({ data: { id: 'A', name: 'Outlet', brand: 'FRESH', district: 'Colombo', depotId: 'D', dockType: 'REAR_DOCK', parkingConstraint: 'NORMAL', windowOpenTime: '04:00', windowCloseTime: '10:00' } });
    const passwordHash = await bcrypt.hash('test-password', 4);
    await db.user.createMany({ data: [
      { id: 'dispatcher', email: 'dispatcher@test', name: 'Dispatcher', role: 'DISPATCHER', passwordHash },
      { id: 'loader', email: 'loader@test', name: 'Loader', role: 'LOADER', depotId: 'D', passwordHash },
      { id: 'other-loader', email: 'other-loader@test', name: 'Other Loader', role: 'LOADER', depotId: 'OTHER', passwordHash },
      { id: 'driver', email: 'driver@test', name: 'Driver', role: 'DRIVER', vehicleId: 'V', passwordHash },
    ] });
    await db.operatingDay.create({ data: { date: day, operating: true } });
    await db.outletHandling.create({ data: { outletId: 'A', serviceMin: 15, source: 'test fixture' } });
    await db.travelLeg.createMany({ data: [
      { fromKey: 'depot:D', toKey: 'outlet:A', distanceKm: 40, durationMin: 30, source: 'test fixture' },
      { fromKey: 'outlet:A', toKey: 'depot:D', distanceKm: 60, durationMin: 45, source: 'test fixture' },
    ] });
    for (const id of ['O', 'O2', 'O3']) await db.order.create({ data: { id, outletId: 'A', requestedDate: day, temp: 'CHILLED', units: 20, weightKg: 40, volumeM3: 4, createdById: 'dispatcher', lines: { create: { id: `${id}-line`, item: 'Box', unit: 'box', requestedQty: 20 } } } });
    const tokens = {};
    async function request(path, body, role = 'dispatcher', method = 'POST', expected = 200) {
      if (process.env.DEBUG_INTEGRATION) console.log(method, path);
      const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const result = await response.json();
      assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    }
    for (const role of ['dispatcher', 'loader', 'other-loader', 'driver']) tokens[role] = (await request('/auth/login', { email: `${role}@test`, password: 'test-password' })).token;
    await request('/planning/validate', {}, 'anonymous', 'POST', 401);
    await request('/planning/validate', {}, 'loader', 'POST', 403);
    const plan = { date: '2026-10-05', depotId: 'D', vehicleId: 'V', plannedDeparture: '05:00', orderIds: ['O'] };
    await request('/planning/validate', { plan: { ...plan, date: '2026-02-30' } }, 'dispatcher', 'POST', 400);
    const draft = await request('/planning/drafts', { clientActionId: 'draft', plan }, 'dispatcher', 'POST', 201);
    assert.equal(await db.trip.count(), 0); assert.equal(await db.tripStop.count(), 0);
    assert.equal((await db.order.findUnique({ where: { id: 'O' } })).status, 'CONFIRMED');
    const allocationInput = { clientActionId: 'allocate', draftId: draft.id, expectedDraftVersion: draft.version };
    const { trip } = await request('/planning/allocate', allocationInput, 'dispatcher', 'POST', 201);
    assert.equal(trip.reservedFuelL, 10);
    assert.deepEqual(await request('/planning/allocate', allocationInput, 'dispatcher', 'POST', 201), { trip });
    await request('/planning/allocate', { ...allocationInput, expectedDraftVersion: 99 }, 'dispatcher', 'POST', 409);
    await request('/planning/allocate', { ...allocationInput, clientActionId: 'allocate-again' }, 'dispatcher', 'POST', 409);
    assert.equal(await db.trip.count(), 1);
    assert.equal((await request('/loader/trips', undefined, 'loader', 'GET')).items.length, 0);
    await request(`/trips/${trip.id}`, undefined, 'loader', 'GET', 403);
    const secondDraft = await request('/planning/drafts', { clientActionId: 'draft-duplicate', plan }, 'dispatcher', 'POST', 201);
    await request('/planning/allocate', { clientActionId: 'duplicate', draftId: secondDraft.id, expectedDraftVersion: 1 }, 'dispatcher', 'POST', 422);
    assert.equal(await db.trip.count(), 1);
    // Multi-publish rollback: first trip must remain hidden when a later entry fails.
    await request('/plans/publish', { clientActionId: 'bad-publish', trips: [{ tripId: trip.id, expectedPlanVersion: 1 }, { tripId: 'missing', expectedPlanVersion: 1 }] }, 'dispatcher', 'POST', 404);
    assert.equal((await db.trip.findUnique({ where: { id: trip.id } })).publishedAt, null);
    assert.equal(await db.mutationRecord.count({ where: { clientActionId: 'bad-publish' } }), 0);
    const publishBody = { clientActionId: 'publish', trips: [{ tripId: trip.id, expectedPlanVersion: 1 }] };
    const published = await request('/plans/publish', publishBody);
    assert.ok(published.trips[0].publishedAt);
    assert.deepEqual(await request('/plans/publish', publishBody), published);
    assert.equal((await request('/loader/trips', undefined, 'loader', 'GET')).items.length, 1);
    assert.equal((await request('/loader/trips', undefined, 'other-loader', 'GET')).items.length, 0);
    await request(`/trips/${trip.id}/acknowledge-plan`, { clientActionId: 'wrong-depot', expectedPlanVersion: 1 }, 'other-loader', 'POST', 403);
    await request(`/trips/${trip.id}/acknowledge-plan`, { clientActionId: 'ack', expectedPlanVersion: 1 }, 'loader');
    await request(`/trips/${trip.id}/ready`, { clientActionId: 'not-loaded', expectedPlanVersion: 1 }, 'loader', 'POST', 409);
    // Simulate the Loader module's checked quantities, then exercise the real ready gate.
    await db.tripStopLine.updateMany({ where: { stopId: trip.stops[0].id }, data: { loadedQty: 20 } });
    await db.loadingRecord.create({ data: { tripId: trip.id, checkedById: 'loader', startedAt: new Date(), status: 'IN_PROGRESS' } });
    assert.equal((await request(`/trips/${trip.id}/ready`, { clientActionId: 'ready', expectedPlanVersion: 1 }, 'loader')).status, 'READY');
    const amended = await request(`/trips/${trip.id}/plan`, { clientActionId: 'amend', expectedPlanVersion: 1, reason: 'Later departure', plan: { ...plan, plannedDeparture: '05:15' } }, 'dispatcher', 'PATCH');
    assert.equal(amended.planVersion, 2); assert.equal(amended.status, 'CONFIRMED'); assert.equal(amended.loaderAcknowledgedPlanVersion, null);
    assert.equal(amended.stops[0].lines[0].loadedQty, 20); assert.ok(amended.publishedAt);
    await request(`/trips/${trip.id}/acknowledge-plan`, { clientActionId: 'old-ack', expectedPlanVersion: 1 }, 'loader', 'POST', 409);
    await request(`/trips/${trip.id}/ready`, { clientActionId: 'no-new-ack', expectedPlanVersion: 2 }, 'loader', 'POST', 409);
    await request(`/trips/${trip.id}/acknowledge-plan`, { clientActionId: 'ack-v2', expectedPlanVersion: 2 }, 'loader');
    await request(`/trips/${trip.id}/ready`, { clientActionId: 'ready-v2', expectedPlanVersion: 2 }, 'loader');
    await request(`/trips/${trip.id}/release`, { clientActionId: 'unsafe-release', expectedPlanVersion: 2, reason: 'Cancel' }, 'dispatcher', 'POST', 409);
    // Loader unloads explicitly; release retains the old attempt and releases reservations.
    await db.tripStopLine.updateMany({ where: { stopId: trip.stops[0].id }, data: { loadedQty: 0 } });
    const released = await request(`/trips/${trip.id}/release`, { clientActionId: 'release', expectedPlanVersion: 2, reason: 'Cancel' });
    assert.equal(released.orders[0].status, 'CONFIRMED'); assert.equal(released.orders[0].activeTripId, null);
    assert.equal((await db.trip.findUnique({ where: { id: trip.id } })).reservedFuelL, 0);
    assert.equal((await request('/loader/trips', undefined, 'loader', 'GET')).items.length, 0);
    // A historical stop no longer blocks reallocation of the same order and vehicle slot.
    const again = await request('/planning/drafts', { clientActionId: 'again', plan }, 'dispatcher', 'POST', 201);
    const next = (await request('/planning/allocate', { clientActionId: 'again-allocate', draftId: again.id, expectedDraftVersion: 1 }, 'dispatcher', 'POST', 201)).trip;
    assert.equal(next.tripNo, 1); assert.equal(await db.tripStop.count({ where: { orderId: 'O' } }), 2);
    // Repeated remove/re-add/reorder operations preserve archives without sequence collisions.
    let current = next;
    for (const [i, ids] of [['O', 'O2'], ['O2'], ['O', 'O2'], ['O2', 'O'], ['O2']].entries()) {
      current = await request(`/trips/${next.id}/plan`, { clientActionId: `edit-${i}`, expectedPlanVersion: current.planVersion, reason: 'Change stops', plan: { ...plan, orderIds: ids } }, 'dispatcher', 'PATCH');
      assert.deepEqual(current.stops.map(s => s.orderId), ids);
    }
    // Two simultaneous HTTP intents cannot reserve the same order twice.
    const racePlan = { ...plan, orderIds: ['O3'], plannedDeparture: '06:45' };
    const raceDrafts = [];
    for (let i = 0; i < 2; i++) raceDrafts.push(await request('/planning/drafts', { clientActionId: `race-draft-${i}`, plan: racePlan }, 'dispatcher', 'POST', 201));
    const raceResults = await Promise.all(raceDrafts.map((d, i) => fetch(`${base}/api/planning/allocate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.dispatcher}` }, body: JSON.stringify({ clientActionId: `race-allocate-${i}`, draftId: d.id, expectedDraftVersion: 1 }) })));
    assert.equal(raceResults.filter(r => r.status === 201).length, 1);
    assert.ok(raceResults.every(r => [201, 409, 422].includes(r.status)));
    for (const response of raceResults) await response.json();
    assert.equal(await db.tripStop.count({ where: { orderId: 'O3', active: true } }), 1);
    assert.equal(await db.trip.count({ where: { releasedAt: null } }), 2);
    assert.equal((await db.trip.aggregate({ where: { releasedAt: null }, _sum: { reservedFuelL: true } }))._sum.reservedFuelL, 20);
    await require('./decisions.scenarios.cjs')({ db, request, base, tokens });
    await require('./connected.scenarios.cjs')({ db, request, base, tokens });
    if (process.env.BROWSER_E2E === '1') await require('./browser.scenarios.cjs')({ db, base });
    // Database-level uniqueness survives code paths outside the service too.
    await assert.rejects(database.query('INSERT INTO "TripStop" ("id", "tripId", "orderId", "sequence", "updatedAt") VALUES ($1,$2,$3,99,now())', ['duplicate-stop', next.id, 'O2']), e => e.code === '23505');
    await assert.rejects(database.query('INSERT INTO "Trip" ("id", "vehicleId", "depotId", "date", "tripNo", "updatedAt") VALUES ($1,$2,$3,$4,1,now())', ['duplicate-trip', 'V', 'D', day]), e => e.code === '23505');
    console.log('PASS: migrations, auth/scopes, draft, allocate/idempotency, atomic publish, amendment/readiness, unload/release, historical attempts, simultaneous HTTP requests and SQL uniqueness.');
  } finally {
    if (app) await app.close();
    if (socket) await socket.stop();
    if (native && admin) {
      await admin.query('ROLLBACK');
      if (schema) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.end();
    } else if (database) await database.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
