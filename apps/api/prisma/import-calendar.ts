import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { importCalendar } from './calendar-data';
config({ path: ['.env', '../../.env'] });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: npm run db:calendar -w apps/api -- "path/to/calendar.csv"');
  console.log(`Imported ${await importCalendar(prisma, path)} operating dates.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
