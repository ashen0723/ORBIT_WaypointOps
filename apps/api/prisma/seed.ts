/**
 * Idempotent seed: safe to run on every container start. Every write is an upsert keyed by a stable id or
 * unique email, so re-running never duplicates rows. IDs and accounts mirror the Designathon prototype
 * (apps/web/src/features/dispatcher/data) so the UI and the database agree until the official datasets
 * (outlets.csv, vehicles.csv, calendar.csv) are imported by the DB owner.
 */
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import { importCalendar, seedDemoCalendar } from './calendar-data';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, Brand, DockType, ParkingConstraint, VehicleType, VehicleTemp } from '../src/generated/prisma/client';

config({ path: ['.env', '../../.env'] });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const depots = [
  { id: 'DEP-PLG', name: 'Peliyagoda' },
  { id: 'DEP-KDY', name: 'Kandy' },
];

const outlets = [
  {
    id: 'OUT-001', name: 'FreshMart – Colombo 05', brand: Brand.FRESH, district: 'Colombo', depotId: 'DEP-PLG',
    dockType: DockType.REAR_DOCK, parkingConstraint: ParkingConstraint.NORMAL, windowOpenTime: '04:00', windowCloseTime: '10:00',
  },
  {
    id: 'OUT-002', name: 'FreshMart – Colombo 07', brand: Brand.FRESH, district: 'Colombo', depotId: 'DEP-PLG',
    dockType: DockType.REAR_DOCK, parkingConstraint: ParkingConstraint.NORMAL, windowOpenTime: '04:00', windowCloseTime: '10:00',
  },
];

const vehicles = [
  {
    id: 'TRK-021', type: VehicleType.TRUCK, temp: VehicleTemp.REEFER, weightCapKg: 1000, volumeCapM3: 18,
    fuelType: 'diesel', kmPerL: 6.25, weeklyFuelQuotaL: 250, depotId: 'DEP-PLG',
  },
];

const users = [
  { id: 'USR-DSP', email: 'dispatcher@waypoint.lk', name: 'Anjali Fernando', role: Role.DISPATCHER },
  { id: 'USR-LDR', email: 'loader@waypoint.lk', name: 'Pradeep Kumara', role: Role.LOADER, depotId: 'DEP-PLG' },
  { id: 'USR-DRV', email: 'driver@waypoint.lk', name: 'Nimal Silva', role: Role.DRIVER, depotId: 'DEP-PLG', vehicleId: 'TRK-021' },
  { id: 'USR-STR', email: 'store@waypoint.lk', name: 'Sanduni Perera', role: Role.STORE_MANAGER, outletId: 'OUT-001' },
  { id: 'USR-STR2', email: 'store2@waypoint.lk', name: 'Kavindu Jayawardena', role: Role.STORE_MANAGER, outletId: 'OUT-002' },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD ?? 'waypoint-demo', 10);

  for (const d of depots) {
    await prisma.depot.upsert({ where: { id: d.id }, update: { name: d.name }, create: d });
  }
  for (const o of outlets) {
    const { id, ...data } = o;
    await prisma.outlet.upsert({ where: { id }, update: data, create: o });
  }
  for (const v of vehicles) {
    const { id, ...data } = v;
    await prisma.vehicle.upsert({ where: { id }, update: data, create: v });
  }
  for (const u of users) {
    const { email, ...data } = u;
    await prisma.user.upsert({ where: { email }, update: { ...data, passwordHash }, create: { ...u, passwordHash } });
  }

  if (process.env.OPERATING_CALENDAR_CSV) await importCalendar(prisma, process.env.OPERATING_CALENDAR_CSV);
  else await seedDemoCalendar(prisma);

  console.log(`Seeded ${depots.length} depots, ${outlets.length} outlets, ${vehicles.length} vehicles, ${users.length} users.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
