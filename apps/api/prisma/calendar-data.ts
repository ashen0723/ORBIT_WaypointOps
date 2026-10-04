import { readFile } from 'node:fs/promises';
import type { PrismaClient } from '../src/generated/prisma/client';

// Small RFC-4180 parser; handles quoted festival names, CRLF and UTF-8 BOM.
export function csvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  source = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (character === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); if (row.some(value => value.length)) rows.push(row); row = []; cell = '';
    } else cell += character;
  }
  if (quoted) throw new Error('Unclosed CSV quote.');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
export async function importCalendar(prisma: PrismaClient, path: string) {
  const [headers, ...rows] = csvRows(await readFile(path, 'utf8'));
  const dateIndex = headers?.indexOf('date') ?? -1, operatingIndex = headers?.indexOf('is_operating') ?? -1;
  if (dateIndex < 0 || operatingIndex < 0) throw new Error('calendar.csv requires date and is_operating columns.');
  const days = rows.map(row => {
    const raw = row[dateIndex], date = new Date(`${raw}T00:00:00Z`), flag = row[operatingIndex];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw ?? '') || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== raw || !['0', '1'].includes(flag)) {
      throw new Error(`Invalid calendar row: ${raw}.`);
    }
    return { date, isOperating: flag === '1' };
  });
  if (new Set(days.map(day => day.date.toISOString())).size !== days.length) throw new Error('Duplicate calendar date.');
  // Parse and validate the entire file before writing any rows.
  await prisma.$transaction(async tx => {
    for (const day of days) await tx.operatingDay.upsert({ where: { date: day.date }, update: { isOperating: day.isOperating }, create: day });
  }, { timeout: 60000 });
  return days.length;
}
export async function seedDemoCalendar(prisma: PrismaClient, now = new Date()) {
  if (await prisma.operatingDay.count()) return;
  const today = new Date(new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10) + 'T00:00:00Z');
  const data = Array.from({ length: 400 }, (_, index) => {
    const date = new Date(today.getTime() + index * 86400000);
    return { date, isOperating: date.getUTCDay() !== 0 };
  });
  await prisma.operatingDay.createMany({ data, skipDuplicates: true });
  console.log('Seeded DEMO operating calendar: Monday-Saturday for 400 days; import official dates when available.');
}
