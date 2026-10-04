/**
 * Idempotent seed: safe to run on every container start. Every write is an upsert keyed by a stable id or
 * unique email, so re-running never duplicates rows. IDs and accounts mirror the Designathon prototype
 * (apps/web/src/features/dispatcher/data) so the UI and the database agree until the official datasets
 * (outlets.csv, vehicles.csv, calendar.csv) are imported by the DB owner.
 */
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, Brand, DockType, ParkingConstraint, VehicleType, VehicleTemp, TempRequirement, OrderStatus } from '../src/generated/prisma/client';

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
  {
    id: 'OUT-005', name: 'City Style – Colombo 02', brand: Brand.STYLE, district: 'Colombo', depotId: 'DEP-PLG',
    dockType: DockType.STREET, parkingConstraint: ParkingConstraint.VAN_ONLY, windowOpenTime: '08:00', windowCloseTime: '14:00',
  },
  {
    id: 'OUT-014', name: 'Hill Fresh – Kandy City', brand: Brand.FRESH, district: 'Kandy', depotId: 'DEP-KDY',
    dockType: DockType.STREET, parkingConstraint: ParkingConstraint.NORMAL, windowOpenTime: '04:30', windowCloseTime: '09:00',
  },
];

const vehicles = [
  {
    id: 'TRK-021', type: VehicleType.TRUCK, temp: VehicleTemp.REEFER, weightCapKg: 1000, volumeCapM3: 18,
    fuelType: 'diesel', kmPerL: 6.25, weeklyFuelQuotaL: 250, depotId: 'DEP-PLG',
  },
  {
    id: 'TRK-030', type: VehicleType.TRUCK, temp: VehicleTemp.AMBIENT, weightCapKg: 2000, volumeCapM3: 26,
    fuelType: 'diesel', kmPerL: 100 / 15, weeklyFuelQuotaL: 280, depotId: 'DEP-PLG', available: true,
  },
  {
    id: 'VAN-012', type: VehicleType.VAN, temp: VehicleTemp.REEFER, weightCapKg: 600, volumeCapM3: 8,
    fuelType: 'diesel', kmPerL: 100 / 11, weeklyFuelQuotaL: 150, depotId: 'DEP-PLG', available: true,
  },
  {
    id: 'TRK-041', type: VehicleType.TRUCK, temp: VehicleTemp.REEFER, weightCapKg: 1000, volumeCapM3: 18,
    fuelType: 'diesel', kmPerL: 100 / 18, weeklyFuelQuotaL: 260, depotId: 'DEP-KDY', available: true,
  },
  {
    id: 'TRK-024', type: VehicleType.TRUCK, temp: VehicleTemp.AMBIENT, weightCapKg: 1800, volumeCapM3: 24,
    fuelType: 'diesel', kmPerL: 100 / 15, weeklyFuelQuotaL: 260, depotId: 'DEP-PLG', available: false,
  },
];

// Fixed Monday keeps allocation fixtures deterministic; these are not rolling production orders.
const allocationDate = new Date('2026-10-05T00:00:00.000Z');
const orders = [
  { id: 'ORD-DEMO-CHILLED', outletId: 'OUT-001', temp: TempRequirement.CHILLED, units: 20, weightKg: 160, volumeM3: 2.4 },
  { id: 'ORD-DEMO-AMBIENT', outletId: 'OUT-002', temp: TempRequirement.AMBIENT, units: 15, weightKg: 90, volumeM3: 1.6 },
  { id: 'ORD-DEMO-VAN', outletId: 'OUT-005', temp: TempRequirement.CHILLED, units: 18, weightKg: 220, volumeM3: 3.5 },
  { id: 'ORD-DEMO-WEIGHT', outletId: 'OUT-001', temp: TempRequirement.CHILLED, units: 100, weightKg: 1001, volumeM3: 2 },
  { id: 'ORD-DEMO-VOLUME', outletId: 'OUT-001', temp: TempRequirement.CHILLED, units: 100, weightKg: 100, volumeM3: 18.1 },
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

  // Email-based upsert may find an account whose ID differs from the demo ID.
  const creator = await prisma.user.findUniqueOrThrow({ where: { email: 'dispatcher@waypoint.lk' } });
  for (const order of orders) {
    const { id, ...data } = order;
    await prisma.order.upsert({
      where: { id },
      update: data,
      create: {
        ...order, createdById: creator.id, requestedDate: allocationDate,
        plannedDate: allocationDate, status: OrderStatus.CONFIRMED,
      },
    });
  }

  console.log(`Seeded ${depots.length} depots, ${outlets.length} outlets, ${vehicles.length} vehicles, ${users.length} users, ${orders.length} allocation orders.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
