import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { ImportDatabase, ImportError, Row, prepareBatch, runImport, validateMapping } from './dataset-import';

function database(client: PrismaClient | Prisma.TransactionClient): ImportDatabase {
  return {
    depotIds: async () => (await client.depot.findMany({ select: { id: true } })).map(d => d.id),
    find: async (dataset, key) => {
      const record = dataset === 'outlets' ? await client.outlet.findUnique({ where: { id: key as string } })
        : dataset === 'vehicles' ? await client.vehicle.findUnique({ where: { id: key as string } })
        : await client.operatingDay.findUnique({ where: { date: key as Date } });
      return record as Row | null;
    },
    create: async (dataset, row) => {
      if (dataset === 'outlets') await client.outlet.create({ data: row as unknown as Prisma.OutletUncheckedCreateInput });
      else if (dataset === 'vehicles') await client.vehicle.create({ data: row as unknown as Prisma.VehicleUncheckedCreateInput });
      else await client.operatingDay.create({ data: row as unknown as Prisma.OperatingDayCreateInput });
    },
    lock: async () => {
      // Stable application-specific key. Held until commit/rollback; parameterized SQL only.
      await client.$executeRaw`SELECT pg_advisory_xact_lock(1869767284, 1)`;
    },
    transaction: async callback => {
      if (!('$transaction' in client)) throw new Error('Nested importer transaction is unsupported');
      return client.$transaction(tx => callback(database(tx)), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 60000,
      });
    },
  };
}

async function readUtf8(path: string): Promise<string> {
  return new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  let apply = false;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--apply' || flag === '--dry-run') {
      if (flag === '--apply' ? apply : dryRun) throw new Error('Duplicate mode argument');
      if (flag === '--apply') apply = true; else dryRun = true;
    } else if (['--outlets', '--vehicles', '--calendar', '--mapping'].includes(flag)) {
      if (options[flag] || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing or duplicate file argument');
      options[flag] = args[++i];
    } else throw new Error('Unknown CLI argument');
  }
  if (apply && dryRun) throw new Error('Choose --apply or --dry-run');
  for (const flag of ['--outlets', '--vehicles', '--calendar', '--mapping']) {
    if (!options[flag]) throw new Error(`${flag} is required`);
  }
  let rawMapping: unknown;
  try { rawMapping = JSON.parse(await readUtf8(options['--mapping'])); }
  catch { throw new Error('Mapping file is unreadable or invalid JSON'); }
  let mapping;
  try { mapping = validateMapping(rawMapping); }
  catch (error) { throw new Error(`Mapping file: ${(error as Error).message}`); }
  let sources;
  try {
    const [outlets, vehicles, calendar] = await Promise.all([
      readUtf8(options['--outlets']), readUtf8(options['--vehicles']), readUtf8(options['--calendar']),
    ]);
    sources = { outlets, vehicles, calendar };
  } catch { throw new Error('A dataset file is unreadable'); }
  const batch = prepareBatch(sources, mapping);
  config({ path: ['.env', '../../.env'], quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const summary = await runImport(batch, database(prisma), apply);
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...summary }));
  } finally { await prisma.$disconnect(); }
}

void main().catch(error => {
  if (error instanceof ImportError) {
    console.error(JSON.stringify({ ...error.summary, problems: error.problems }));
  } else {
    // Never emit database URLs, credentials, raw SQL or private CSV values.
    const safe = error instanceof Error && /^(Mapping file|A dataset file|DATABASE_URL|--|Choose |Unknown CLI|Duplicate mode|Missing or duplicate)/.test(error.message);
    console.error(JSON.stringify({ create: 0, unchanged: 0, conflict: 0, invalid: 1,
      error: safe ? error.message : 'Import failed; no batch committed. Check database connection, migrations and concurrent changes.' }));
  }
  process.exitCode = 1;
});
