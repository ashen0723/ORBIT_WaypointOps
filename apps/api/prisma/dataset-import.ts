import { parse } from 'csv-parse/sync';

export const fields = {
  outlets: ['id', 'name', 'brand', 'district', 'depotId', 'dockType', 'parkingConstraint', 'mallWindow', 'windowOpenTime', 'windowCloseTime'],
  vehicles: ['id', 'type', 'temp', 'weightCapKg', 'volumeCapM3', 'fuelType', 'kmPerL', 'weeklyFuelQuotaL', 'depotId', 'available'],
  calendar: ['date', 'operating'],
} as const;
export type Dataset = keyof typeof fields;
export type Row = Record<string, string | number | boolean | Date | null>;
interface FieldMapping { column?: string; default?: unknown; onBlank?: unknown; values?: Record<string, unknown> }
interface DatasetMapping {
  csv: { delimiter: string; encoding: 'utf8' };
  fields: Record<string, FieldMapping>;
  ignoreColumns?: string[];
  timeFormat?: 'HH:mm';
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY';
  fuelEfficiencyUnit?: 'kmPerL' | 'LPer100Km';
  depotIds?: { mode: 'identity' | 'map'; values?: Record<string, string> };
  scope?: 'global';
}
export interface Mapping { version: 1; datasets: Record<Dataset, DatasetMapping>; description?: string }
export interface Summary { create: number; unchanged: number; conflict: number; invalid: number }
export interface Problem { dataset: Dataset; row?: number; field?: string; code: string }
export interface Batch { rows: Record<Dataset, Row[]>; problems: Problem[] }
export interface ImportDatabase {
  depotIds(): Promise<string[]>;
  find(dataset: Dataset, key: string | Date): Promise<Row | null>;
  create(dataset: Dataset, row: Row): Promise<void>;
  transaction<T>(fn: (db: ImportDatabase) => Promise<T>): Promise<T>;
  lock(): Promise<void>;
}
export class ImportError extends Error {
  constructor(public readonly summary: Summary, public readonly problems: Problem[]) {
    super('Import rejected; no rows applied');
  }
}
const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const enums: Record<string, readonly string[]> = {
  brand: ['FRESH', 'STYLE', 'TECH'], type: ['TRUCK', 'VAN'], temp: ['REEFER', 'AMBIENT'],
  dockType: ['REAR_DOCK', 'STREET', 'MALL_BAY'], parkingConstraint: ['NORMAL', 'VAN_ONLY', 'MALL_DOCK'],
};
const reserved = {
  outlets: new Set(['OUT-001', 'OUT-002', 'OUT-005', 'OUT-014']),
  vehicles: new Set(['TRK-021', 'TRK-030', 'VAN-012', 'TRK-041', 'TRK-024']),
};
function keys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unknown mapping property');
}

/** Validate configuration before opening a database connection. Never infer source headers. */
export function validateMapping(value: unknown): Mapping {
  if (!object(value) || value.version !== 1 || !object(value.datasets)) throw new Error('Mapping requires version 1 and datasets');
  keys(value, ['version', 'datasets', 'description']);
  keys(value.datasets, Object.keys(fields));
  for (const dataset of Object.keys(fields) as Dataset[]) {
    const m = value.datasets[dataset];
    if (!object(m) || !object(m.fields) || !object(m.csv)) throw new Error(`${dataset}: fields and csv mapping required`);
    keys(m, ['fields', 'csv', 'ignoreColumns', 'timeFormat', 'dateFormat', 'fuelEfficiencyUnit', 'depotIds', 'scope']);
    keys(m.csv, ['delimiter', 'encoding']);
    if (typeof m.csv.delimiter !== 'string' || m.csv.delimiter.length !== 1 || /[\r\n"]/.test(m.csv.delimiter) || m.csv.encoding !== 'utf8') throw new Error(`${dataset}: explicit single-character delimiter and utf8 encoding required`);
    keys(m.fields, fields[dataset]);
    const columns: string[] = [];
    for (const field of fields[dataset]) {
      const f = m.fields[field];
      if (!object(f)) throw new Error(`${dataset}.${field}: mapping required`);
      keys(f, ['column', 'default', 'onBlank', 'values']);
      if (own(f, 'column') === own(f, 'default')) throw new Error(`${dataset}.${field}: choose exactly one column or default`);
      if ((field === 'id' || field === 'date') && !own(f, 'column')) throw new Error(`${dataset}.${field}: source column required`);
      if (own(f, 'column')) {
        if (typeof f.column !== 'string' || !f.column.trim() || /[<>]/.test(f.column)) throw new Error(`${dataset}.${field}: replace source-column placeholder`);
        columns.push(f.column);
        if ((enums[field] || field === 'available' || field === 'operating') && (!object(f.values) || !Object.keys(f.values).length)) throw new Error(`${dataset}.${field}: explicit value map required`);
      } else if (own(f, 'onBlank') || own(f, 'values')) throw new Error(`${dataset}.${field}: default cannot have source handling`);
      if (own(f, 'values')) {
        if (!object(f.values)) throw new Error(`${dataset}.${field}: invalid value map`);
        if (!enums[field] && field !== 'available' && field !== 'operating') throw new Error(`${dataset}.${field}: value map not supported`);
        for (const output of Object.values(f.values)) {
          if (enums[field] ? !enums[field].includes(output as string) : typeof output !== 'boolean') throw new Error(`${dataset}.${field}: invalid mapped destination value`);
        }
      }
    }
    if (new Set(columns).size !== columns.length) throw new Error(`${dataset}: ambiguous reused source column`);
    if (m.ignoreColumns !== undefined && (!Array.isArray(m.ignoreColumns) || m.ignoreColumns.some(c => typeof c !== 'string' || !c.trim()) || new Set(m.ignoreColumns).size !== m.ignoreColumns.length || m.ignoreColumns.some(c => columns.includes(c)))) throw new Error(`${dataset}: invalid ignored columns`);
    if (dataset === 'calendar') {
      if (m.scope !== 'global' || !['YYYY-MM-DD', 'DD/MM/YYYY'].includes(m.dateFormat as string) || (m.ignoreColumns as unknown[] | undefined)?.length || m.depotIds !== undefined || m.timeFormat !== undefined || m.fuelEfficiencyUnit !== undefined) throw new Error('calendar: global scope, explicit date format, and only date/operating columns required');
    } else {
      if (!object(m.depotIds) || !['identity', 'map'].includes(m.depotIds.mode as string)) throw new Error(`${dataset}: explicit depotIds mode required`);
      keys(m.depotIds, ['mode', 'values']);
      if (m.depotIds.mode === 'map' && (!object(m.depotIds.values) || !Object.keys(m.depotIds.values).length || Object.values(m.depotIds.values).some(v => typeof v !== 'string' || !v || v.trim() !== v))) throw new Error(`${dataset}: explicit depot mapping required`);
      if (m.depotIds.mode === 'identity' && m.depotIds.values !== undefined) throw new Error(`${dataset}: identity depot mapping cannot have aliases`);
      if (m.scope !== undefined || m.dateFormat !== undefined) throw new Error(`${dataset}: unsupported mapping property`);
      if (dataset === 'outlets' && (m.timeFormat !== 'HH:mm' || m.fuelEfficiencyUnit !== undefined)) throw new Error('outlets: HH:mm timeFormat required');
      if (dataset === 'vehicles' && (!['kmPerL', 'LPer100Km'].includes(m.fuelEfficiencyUnit as string) || m.timeFormat !== undefined)) throw new Error('vehicles: explicit fuelEfficiencyUnit required');
    }
  }
  return value as unknown as Mapping;
}

function exactId(value: unknown): string {
  if (typeof value !== 'string' || !value || value.trim() !== value || /[\x00-\x1f\x7f]/.test(value)) throw new Error('INVALID_ID');
  return value;
}
function time(value: unknown): string {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('INVALID_TIME');
  return value;
}
export function dateValue(value: unknown, format: string): Date {
  if (typeof value !== 'string') throw new Error('INVALID_DATE');
  const match = format === 'YYYY-MM-DD' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error('INVALID_DATE');
  const [year, month, day] = format === 'YYYY-MM-DD' ? [match[1], match[2], match[3]] : [match[3], match[2], match[1]];
  if (year === '0000') throw new Error('INVALID_DATE');
  const iso = `${year}-${month}-${day}`;
  const result = new Date(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== iso) throw new Error('INVALID_DATE');
  return result;
}
function normalize(dataset: Dataset, record: Record<string, string>, m: DatasetMapping): Row {
  const row: Row = {};
  for (const field of fields[dataset]) {
    const f = m.fields[field];
    let value: unknown = f.column === undefined ? f.default : record[f.column];
    let fromSource = f.column !== undefined;
    if (f.column !== undefined && (value === '' || typeof value === 'string' && !value.trim())) {
      if (!own(f, 'onBlank')) throw new Error(`MISSING_VALUE:${field}`);
      // IDs must never be repaired by defaulting blank/whitespace cells.
      if (field === 'id' || field === 'date') throw new Error(`MISSING_VALUE:${field}`);
      value = f.onBlank;
      fromSource = false;
    } else if (f.column !== undefined && f.values) {
      if (typeof value !== 'string' || !own(f.values, value)) throw new Error(`UNMAPPED_VALUE:${field}`);
      value = f.values[value];
    }
    if (field === 'id' || field === 'depotId') value = exactId(value);
    else if (field === 'date') value = dateValue(value, m.dateFormat!);
    else if (field === 'available' || field === 'operating') {
      if (typeof value !== 'boolean') throw new Error(`INVALID_BOOLEAN:${field}`);
    } else if (enums[field]) {
      if (!enums[field].includes(value as string)) throw new Error(`INVALID_ENUM:${field}`);
    } else if (['weightCapKg', 'volumeCapM3', 'kmPerL', 'weeklyFuelQuotaL'].includes(field)) {
      if (typeof value !== 'number' && (typeof value !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))) throw new Error(`INVALID_NUMBER:${field}`);
      let numeric = Number(value);
      if (!Number.isFinite(numeric) || (field === 'weeklyFuelQuotaL' ? numeric < 0 : numeric <= 0)) throw new Error(`INVALID_NUMBER:${field}`);
      if (field === 'kmPerL' && fromSource && m.fuelEfficiencyUnit === 'LPer100Km') {
        numeric = 100 / numeric;
        if (!Number.isFinite(numeric) || numeric <= 0) throw new Error(`INVALID_NUMBER:${field}`);
      }
      value = numeric;
    } else if (field === 'windowOpenTime' || field === 'windowCloseTime') value = time(value);
    else if (field === 'mallWindow') {
      if (value !== null) {
        if (typeof value !== 'string' || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(value) || time(value.slice(0, 5)) >= time(value.slice(6))) throw new Error('INVALID_MALL_WINDOW');
      }
    } else if (typeof value !== 'string' || !value.trim() || /\x00/.test(value)) throw new Error(`MISSING_VALUE:${field}`);
    row[field] = value as Row[string];
  }
  if (dataset !== 'calendar') {
    if (m.depotIds!.mode === 'map') {
      if (!own(m.depotIds!.values!, row.depotId as string)) throw new Error('UNMAPPED_DEPOT');
      row.depotId = m.depotIds!.values![row.depotId as string];
    }
    if (reserved[dataset].has(row.id as string)) throw new Error('RESERVED_DEMO_ID');
  }
  if (dataset === 'outlets' && (row.windowOpenTime as string) >= (row.windowCloseTime as string)) throw new Error('INVALID_WINDOW');
  return row;
}

export function prepareBatch(csv: Record<Dataset, string>, mapping: Mapping): Batch {
  const rows: Batch['rows'] = { outlets: [], vehicles: [], calendar: [] };
  const problems: Problem[] = [];
  for (const dataset of Object.keys(fields) as Dataset[]) {
    const m = mapping.datasets[dataset];
    let records: string[][];
    try { records = parse(csv[dataset], { bom: true, delimiter: m.csv.delimiter, skip_empty_lines: true, relax_column_count: false }); }
    catch { problems.push({ dataset, code: 'INVALID_CSV' }); continue; }
    const headers = records.shift();
    if (!headers?.length || headers.some(h => !h.trim()) || new Set(headers).size !== headers.length) { problems.push({ dataset, code: 'INVALID_HEADERS' }); continue; }
    const mapped = Object.values(m.fields).flatMap(f => f.column === undefined ? [] : [f.column]);
    if (mapped.some(h => !headers.includes(h))) { problems.push({ dataset, code: 'MISSING_MAPPED_HEADER' }); continue; }
    if (headers.some(h => !mapped.includes(h) && !m.ignoreColumns?.includes(h))) { problems.push({ dataset, code: 'UNMAPPED_HEADER' }); continue; }
    if (!records.length) { problems.push({ dataset, code: 'EMPTY_DATASET' }); continue; }
    const seen = new Set<string>();
    records.forEach((cells, index) => {
      try {
        const row = normalize(dataset, Object.fromEntries(headers.map((h, i) => [h, cells[i]])), m);
        const key = row.id ?? (row.date as Date).toISOString();
        if (seen.has(key as string)) throw new Error('DUPLICATE_KEY');
        seen.add(key as string); rows[dataset].push(row);
      } catch (e) {
        const [code, field] = (e as Error).message.split(':');
        problems.push({ dataset, row: index + 2, ...(field ? { field } : {}), code });
      }
    });
  }
  return { rows, problems };
}
const comparable = (v: Row[string]) => v instanceof Date ? v.toISOString() : v;
export async function inspectBatch(batch: Batch, db: ImportDatabase) {
  const summary: Summary = { create: 0, unchanged: 0, conflict: 0, invalid: batch.problems.length };
  const problems = [...batch.problems];
  const depots = new Set(await db.depotIds());
  const creates: { dataset: Dataset; row: Row }[] = [];
  for (const dataset of Object.keys(fields) as Dataset[]) {
    for (const row of batch.rows[dataset]) {
      if (dataset !== 'calendar' && !depots.has(row.depotId as string)) {
        summary.invalid++; problems.push({ dataset, field: 'depotId', code: 'UNKNOWN_DEPOT' }); continue;
      }
      const existing = await db.find(dataset, (row.id ?? row.date) as string | Date);
      if (!existing) { summary.create++; creates.push({ dataset, row }); }
      else if (fields[dataset].every(f => comparable(row[f]) === comparable(existing[f]))) summary.unchanged++;
      else { summary.conflict++; problems.push({ dataset, code: 'EXISTING_RECORD_DIFFERS' }); }
    }
  }
  return { summary, problems, creates };
}
export async function runImport(batch: Batch, db: ImportDatabase, apply = false): Promise<Summary> {
  const plan = await inspectBatch(batch, db);
  if (plan.summary.invalid || plan.summary.conflict) throw new ImportError(plan.summary, plan.problems);
  if (!apply) return plan.summary;
  return db.transaction(async tx => {
    await tx.lock();
    const checked = await inspectBatch(batch, tx);
    if (checked.summary.invalid || checked.summary.conflict) throw new ImportError(checked.summary, checked.problems);
    for (const entry of checked.creates) await tx.create(entry.dataset, entry.row);
    return checked.summary;
  });
}
