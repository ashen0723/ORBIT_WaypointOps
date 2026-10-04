import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { FleetModule } from './fleet.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const vehicle = {
  id: 'TRK-021', type: 'TRUCK', temp: 'REEFER', weightCapKg: 5000,
  volumeCapM3: 20, fuelType: 'DIESEL', kmPerL: 8, weeklyFuelQuotaL: 200,
  depotId: 'DEP-PLG', available: true,
};
const trip = (tripNo: number) => ({
  id: `TRIP-${tripNo}`, date: new Date('2026-10-05T00:00:00.000Z'), tripNo,
  status: 'DRAFT', plannedDeparture: null, totalWeightKg: 100,
  totalVolumeM3: 1, distanceKm: null,
});

describe('Fleet HTTP / service integration', () => {
  let app: INestApplication;
  let base: string;
  const findMany = jest.fn();
  const findUnique = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ignoreEnvFile:true,skipProcessEnv:true,load:[()=>({JWT_SECRET:'test-only-fleet-secret-at-least-32-characters'})]}), PrismaModule, FleetModule] })
      .overrideProvider(AuthService).useValue({authenticate: async (header: string) => {if (!header) throw new UnauthorizedException(); return {id: 'dispatcher', role: 'DISPATCHER'};}})
      .overrideProvider(PrismaService)
      .useValue({ vehicle: { findMany, findUnique } }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([vehicle]);
    findUnique.mockResolvedValue(vehicle);
  });
  const get = (path: string) => fetch(`${base}/api/${path.startsWith('/') ? 'vehicles' : 'fleet/vehicles'}${path}`, {headers: {Authorization: 'Bearer test'}});
  it('requires authentication for vehicle details', async () => {expect((await fetch(`${base}/api/vehicles/TRK-021`)).status).toBe(401);});

  it('lists only projected vehicle data without date scheduling fields', async () => {
    const res = await get('');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([vehicle]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {}, orderBy: { id: 'asc' },
      select: expect.objectContaining({ id: true, available: true }),
    }));
    const select = findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('drivers');
    expect(select).not.toHaveProperty('trips');
  });

  it.each(['depot', 'depotId'])('combines %s and capability filters in the database query', async alias => {
    const res = await get(`?${alias}=DEP-PLG&available=false&type=VAN&temp=AMBIENT`);
    expect(res.status).toBe(200);
    expect(findMany.mock.calls[0][0].where).toEqual({
      depotId: 'DEP-PLG', available: false, type: 'VAN', temp: 'AMBIENT',
    });
  });

  it('accepts available=true', async () => {
    expect((await get('?available=true')).status).toBe(200);
    expect(findMany.mock.calls[0][0].where).toEqual({ available: true });
  });

  it.each([0, 1, 2, 3])('derives scheduling for %i trips, without per-vehicle queries', async count => {
    findMany.mockResolvedValue([{ ...vehicle, trips: Array.from({ length: count }, (_, i) => trip(i + 1)) }]);
    const res = await get('?date=2026-10-05');
    expect(res.status).toBe(200);
    expect((await res.json())[0]).toMatchObject({
      tripCountForDate: count, remainingTripSlots: Math.max(0, 2 - count), schedulable: count < 2,
      trips: Array.from({ length: count }, (_, i) => ({ ...trip(i + 1), date: '2026-10-05T00:00:00.000Z' })),
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany.mock.calls[0][0].select.trips).toMatchObject({
      where: { date: new Date('2026-10-05T00:00:00.000Z') }, orderBy: { tripNo: 'asc' },
    });
  });

  it('marks an unavailable vehicle unschedulable even with slots remaining', async () => {
    findUnique.mockResolvedValue({ ...vehicle, available: false, trips: [] });
    const res = await get('/TRK-021?date=2026-10-05');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tripCountForDate: 0, remainingTripSlots: 2, schedulable: false });
  });

  it('returns one vehicle by its exact ID', async () => {
    const res = await get('/TRK-021');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(vehicle);
    expect(findUnique.mock.calls[0][0].where).toEqual({ id: 'TRK-021' });
  });

  it('returns an empty list when no vehicles match', async () => {
    findMany.mockResolvedValue([]);
    expect(await (await get('')).json()).toEqual([]);
  });

  it('returns 404 for an unknown vehicle', async () => {
    findUnique.mockResolvedValue(null);
    expect((await get('/unknown')).status).toBe(404);
  });

  it.each([
    'available=1', 'available=', 'available=true&available=false',
    'date=2026-02-30', 'date=2025-02-29', 'date=2026-13-01', 'date=0000-01-01',
    'date=2026-10-05T00:00:00Z', 'date=bad', 'date=',
    'type=truck', 'temp=FROZEN', 'depot=', 'depot=A&depotId=B',
  ])('rejects invalid query %s before database access', async query => {
    expect((await get(`?${query}`)).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('validates the detail date before lookup', async () => {
    expect((await get('/TRK-021?date=invalid')).status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('accepts a real leap day without changing the database date', async () => {
    findMany.mockResolvedValue([]);
    expect((await get('?date=2028-02-29')).status).toBe(200);
    expect(findMany.mock.calls[0][0].select.trips.where.date.toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });
});
