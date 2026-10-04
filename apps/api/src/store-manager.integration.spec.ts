import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from './app.module';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { colomboClock } from './orders/order-policy.service';

// Use a DISPOSABLE PostgreSQL database with committed migrations already applied.
// No destructive reset is performed. Only this suite's own fixture records are deleted.
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration('Store Manager HTTP/database integration', () => {
  let app: INestApplication, prisma: PrismaService, base: string;
  const suffix = randomUUID();
  const depotId = `test-depot-${suffix}`, outletId = `test-store-${suffix}`, otherOutletId = `test-other-${suffix}`;
  const userId = `test-user-${suffix}`, otherId = `test-user2-${suffix}`, dispatchId = `test-dispatch-${suffix}`, driverId = `test-driver-${suffix}`;
  let token: string, otherToken: string, dispatcherToken: string, driverToken: string;
  let orderId: string, lineId: string, deliveryId: string, evidenceId: string, requestedDate: string;
  const password = 'manager-test-pass';
  const actionId = randomUUID();
  const payload = () => ({ clientActionId: actionId, requestedDate, temp: 'AMBIENT', lines: [{ item: 'Sourdough loaf', unit: 'crates', requestedQty: 6 }] });
  async function request(path: string, auth?: string, body?: unknown, method?: string) {
    const response = await fetch(base + path, { method: method ?? (body ? 'POST' : 'GET'),
      headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() as any };
  }
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'integration-test-only-secret-at-least-32-characters';
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL, max: 1 }) });
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(database).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api`;
    prisma = app.get(PrismaService);
    await prisma.depot.create({ data: { id: depotId, name: 'Integration depot' } });
    for (const id of [outletId, otherOutletId]) await prisma.outlet.create({ data: {
      id, name: 'Integration Fresh', brand: 'FRESH', district: 'Colombo', depotId, dockType: 'REAR_DOCK', parkingConstraint: 'NORMAL', windowOpenTime: '05:00', windowCloseTime: '07:30',
    } });
    const passwordHash = await bcrypt.hash(password, 4);
    for (const user of [
      { id: userId, role: 'STORE_MANAGER' as const, outletId }, { id: otherId, role: 'STORE_MANAGER' as const, outletId: otherOutletId },
      { id: dispatchId, role: 'DISPATCHER' as const }, { id: driverId, role: 'DRIVER' as const },
    ]) await prisma.user.create({ data: { ...user, email: `${user.id}@test.invalid`, name: 'Integration user', passwordHash } });
    const today = new Date(`${colomboClock(new Date()).date}T00:00:00Z`);
    for (let index = 1; index <= 15; index++) {
      const date = new Date(today.getTime() + index * 86400000);
      // Avoid overwriting dates imported by the DB owner.
      await prisma.operatingDay.upsert({ where: { date }, update: {}, create: { date, isOperating: date.getUTCDay() !== 0 } });
    }
    token = (await request('/auth/login', undefined, { email: `${userId}@test.invalid`, password })).body.token;
    otherToken = (await request('/auth/login', undefined, { email: `${otherId}@test.invalid`, password })).body.token;
    dispatcherToken = (await request('/auth/login', undefined, { email: `${dispatchId}@test.invalid`, password })).body.token;
    driverToken = (await request('/auth/login', undefined, { email: `${driverId}@test.invalid`, password })).body.token;
    expect(token).toEqual(expect.any(String));
    requestedDate = (await request('/orders/policy', token)).body.earliestDeliveryDate;
  }, 60000);
  afterAll(async () => {
    try {
    if (prisma) {
      const receipts = await prisma.receipt.findMany({ where: { confirmedById: { in: [userId, otherId] } }, select: { id: true } });
      await prisma.receipt.deleteMany({ where: { id: { in: receipts.map(receipt => receipt.id) } } });
      await prisma.proofOfDelivery.deleteMany({ where: { delivery: { stop: { order: { outletId: { in: [outletId, otherOutletId] } } } } } });
      await prisma.delivery.deleteMany({ where: { stop: { order: { outletId: { in: [outletId, otherOutletId] } } } } });
      await prisma.trip.deleteMany({ where: { depotId } });
      await prisma.order.deleteMany({ where: { outletId: { in: [outletId, otherOutletId] } } });
      await prisma.auditEvent.deleteMany({ where: { actorId: { in: [userId, otherId, dispatchId, driverId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userId, otherId, dispatchId, driverId] } } });
      await prisma.vehicle.deleteMany({ where: { depotId } });
      await prisma.outlet.deleteMany({ where: { depotId } });
      await prisma.depot.delete({ where: { id: depotId } });
    }
    } finally {
      if (prisma) await prisma.$disconnect();
      if (app) await app.close();
    }
  }, 60000);
  it('authenticates real users without exposing hashes; rejects wrong passwords', async () => {
    const me = await request('/auth/me', token);
    expect(me.status).toBe(200); expect(me.body.role).toBe('store_manager'); expect(me.body.passwordHash).toBeUndefined();
    expect((await request('/auth/login', undefined, { email: `${userId}@test.invalid`, password: 'incorrect' })).status).toBe(401);
    expect((await request('/orders')).status).toBe(401);
    expect((await request('/orders', 'forged')).status).toBe(401);
  });
  it('returns only the assigned outlet and catalog', async () => {
    expect((await request('/outlets/me', token)).body.id).toBe(outletId);
    expect((await request('/outlets/me', otherToken)).body.id).toBe(otherOutletId);
    expect((await request('/orders/catalog', token)).body.every((item: any) => item.brand === 'FRESH')).toBe(true);
    expect((await request('/outlets/me', driverToken)).status).toBe(403);
  });
  it('rejects forged outlet identity, fractions, unknown products and mixed temperature', async () => {
    expect((await request('/orders', token, { ...payload(), outletId: otherOutletId })).status).toBe(400);
    expect((await request('/orders', token, { ...payload(), lines: [{ item: 'Sourdough loaf', unit: 'crates', requestedQty: 1.5 }] })).status).toBe(400);
    expect((await request('/orders', token, { ...payload(), lines: [{ item: 'Forged item', unit: 'crates', requestedQty: 2 }] })).status).toBe(422);
    expect((await request('/orders', token, { ...payload(), temp: 'CHILLED' })).status).toBe(422);
    expect((await request('/orders', driverToken, payload())).status).toBe(403);
  });
  it('persists server-calculated totals and replays a retried order once', async () => {
    const created = await request('/orders', token, payload()); expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ outletId, status: 'CONFIRMED', weightKg: 38.4, volumeM3: 0.24, units: 6 });
    orderId = created.body.id; lineId = created.body.lines[0].id;
    expect((await prisma.order.findUnique({ where: { id: orderId } }))?.outletId).toBe(outletId);
    expect((await request('/orders', token, payload())).body.id).toBe(orderId);
    expect(await prisma.order.count({ where: { clientActionId: actionId } })).toBe(1);
    expect((await request('/orders', token, { ...payload(), lines: [{ item: 'Sourdough loaf', unit: 'crates', requestedQty: 7 }] })).status).toBe(409);
  });
  it('makes the same order visible to Dispatcher, hides it from another outlet', async () => {
    expect((await request(`/orders/${orderId}`, otherToken)).status).toBe(404);
    expect((await request('/orders', otherToken)).body.items).toHaveLength(0);
    expect((await request(`/orders/${orderId}`, dispatcherToken)).body.id).toBe(orderId);
    expect((await request('/orders', dispatcherToken)).body.items.some((order: any) => order.id === orderId)).toBe(true);
    expect((await request('/orders', driverToken)).status).toBe(403);
    expect((await request('/orders?limit=-1', token)).status).toBe(400);
  });
  it('allows separate dry and chilled orders for the same requested day', async () => {
    const chilled = await request('/orders', token, { requestedDate, temp: 'CHILLED', lines: [{ item: 'Whole milk 2L', unit: 'cases', requestedQty: 2 }] });
    expect(chilled.status).toBe(201); expect(chilled.body.id).not.toBe(orderId);
  });
  it('blocks receipt confirmation for failed or unfinished deliveries', async () => {
    const vehicle = await prisma.vehicle.create({ data: { id: `test-vehicle-${suffix}`, type: 'VAN', temp: 'REEFER', weightCapKg: 1000, volumeCapM3: 10, fuelType: 'diesel', kmPerL: 8, weeklyFuelQuotaL: 100, depotId } });
    const trip = await prisma.trip.create({ data: { vehicleId: vehicle.id, depotId, date: new Date(requestedDate), tripNo: 1 } });
    const stop = await prisma.tripStop.create({ data: { tripId: trip.id, orderId, sequence: 1 } });
    const delivery = await prisma.delivery.create({ data: { stopId: stop.id, outcome: 'FAILED', completedAt: new Date() } }); deliveryId = delivery.id;
    expect((await request('/receipts', token, { deliveryId, checks: [{ orderLineId: lineId, result: 'OK', receivedQty: 6 }] })).status).toBe(409);
    await prisma.delivery.update({ where: { id: deliveryId }, data: { outcome: 'PARTIAL' } });
    await prisma.order.update({ where: { id: orderId }, data: { status: 'IN_TRANSIT' } });
    await prisma.orderLine.update({ where: { id: lineId }, data: { deliveredQty: 4 } });
  });
  it('rejects mismatched receipt lines, unreported shortages and another outlet', async () => {
    expect((await request('/receipts', token, { deliveryId, checks: [{ orderLineId: 'unrelated', result: 'OK', receivedQty: 6 }] })).status).toBe(400);
    expect((await request('/receipts', token, { deliveryId, checks: [{ orderLineId: lineId, result: 'OK', receivedQty: 6 }] })).status).toBe(422);
    expect((await request('/receipts', otherToken, { deliveryId, checks: [{ orderLineId: lineId, result: 'OK', receivedQty: 6 }] })).status).toBe(404);
  });
  it('uploads a photo and protects it from another outlet', async () => {
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR9sAAAAASUVORK5CYII=', 'base64');
    const form = new FormData(); form.append('photo', new Blob([image], { type: 'image/png' }), 'proof.png');
    const response = await fetch(base + `/receipts/orders/${orderId}/evidence`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    expect(response.status).toBe(201); evidenceId = (await response.json() as any).evidenceId;
    const stored = await fetch(base + `/receipts/evidence/${evidenceId}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(stored.status).toBe(200); expect(Buffer.from(await stored.arrayBuffer())).toEqual(image);
    expect((await request(`/receipts/evidence/${evidenceId}`, otherToken)).status).toBe(404);
  });
  it('saves discrepancies, quantity, evidence and audit without overwriting partial delivery', async () => {
    const body = { deliveryId, checks: [{ orderLineId: lineId, result: 'ISSUE', receivedQty: 4, issueType: 'MISSING', note: 'Two crates missing', evidenceId }] };
    const confirmed = await request('/receipts', token, body);
    expect(confirmed.status).toBe(201); expect(confirmed.body.status).toBe('CONFIRMED_WITH_ISSUE');
    expect(confirmed.body.items[0].receivedQty).toBe(4); expect(confirmed.body.issues[0]).toMatchObject({ note: 'Two crates missing', photoRef: evidenceId });
    const detail = await request(`/orders/${orderId}`, token);
    expect(detail.body.status).toBe('RECEIVED'); expect(detail.body.stop.delivery.outcome).toBe('PARTIAL');
    expect(detail.body.timeline.some((event: any) => event.action === 'ORDER_RECEIVED')).toBe(true);
    expect((await request('/receipts', token, body)).body.id).toBe(confirmed.body.id);
    expect((await request('/receipts', token, { ...body, checks: [{ ...body.checks[0], note: 'different note' }] })).status).toBe(409);
    expect((await request(`/receipts/orders/${orderId}`, dispatcherToken)).body.id).toBe(confirmed.body.id);
  });
});
