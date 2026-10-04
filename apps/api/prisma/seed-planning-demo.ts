/** Optional fictional planning fixture. Run db:seed first. Never imports official travel data. */
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
config({ path: ['.env', '../../.env'] });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const day = process.env.PLANNING_DEMO_DATE ?? '2026-10-05';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day || new Date(day).getUTCDay() === 0) throw new Error('PLANNING_DEMO_DATE must be a valid Monday–Saturday YYYY-MM-DD.');
  const source = 'Fictional planning demo; replace with authoritative travel/handling data';
  await db.$transaction(async tx => {
    for (const id of ['OUT-001', 'OUT-002']) {
      if (!await tx.outlet.findUnique({ where: { id } })) throw new Error('Run npm run db:seed first.');
      await tx.outletHandling.upsert({ where: { outletId: id }, update: {}, create: { outletId: id, serviceMin: 15, source } });
    }
    await tx.operatingDay.upsert({ where: { date: new Date(day) }, update: {}, create: { date: new Date(day), operating: true } });
    const legs = [
      ['depot:DEP-PLG', 'outlet:OUT-001', 20, 30], ['outlet:OUT-001', 'depot:DEP-PLG', 20, 30],
      ['depot:DEP-PLG', 'outlet:OUT-002', 25, 35], ['outlet:OUT-002', 'depot:DEP-PLG', 25, 35],
      ['outlet:OUT-001', 'outlet:OUT-002', 5, 10], ['outlet:OUT-002', 'outlet:OUT-001', 5, 10],
    ] as const;
    for (const [fromKey, toKey, distanceKm, durationMin] of legs) await tx.travelLeg.upsert({ where: { fromKey_toKey: { fromKey, toKey } }, update: {}, create: { fromKey, toKey, distanceKm, durationMin, source } });
    for (const [i, outletId] of ['OUT-001', 'OUT-002'].entries()) {
      const id = `DEMO-PLAN-${day}-${i + 1}`;
      await tx.order.upsert({ where: { id }, update: {}, create: { id, outletId, createdById: i === 0 ? 'USR-STR' : 'USR-STR2', requestedDate: new Date(day), temp: 'CHILLED', units: 20, weightKg: 200, volumeM3: 2, lines: { create: { item: 'Demo chilled crate', unit: 'crate', requestedQty: 20 } } } });
    }
  });
  console.log(`Planning demo ready for ${day}; use DEP-PLG, TRK-021, departure 05:00 and DEMO-PLAN-${day}-1 / -2.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
