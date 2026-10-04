import type { LineDraft, Unit } from '../types/orders';

export function createBlankLine(unit: Unit = 'cases'): LineDraft {
  return { id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', qty: '', unit };
}

export function isLineComplete(line: LineDraft): boolean {
  return line.name.trim().length > 0 && Number(line.qty) > 0;
}

export function lineError(line: LineDraft): string | null {
  const hasName = line.name.trim().length > 0;
  const hasQty = Number(line.qty) > 0;
  if (hasName && !hasQty) return 'Enter a quantity of 1 or more';
  if (!hasName && line.qty !== '') return 'Enter an item name';
  return null;
}