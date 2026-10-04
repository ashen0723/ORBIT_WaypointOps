import { catalog } from '../data/catalog';

export function estimateLoad(lines: {name: string;qty: number;}[]) {
  return lines.reduce(
    (acc, line) => {
      const match = catalog.find((c) => c.name.toLowerCase() === line.name.trim().toLowerCase());
      acc.kg += (match?.kg ?? 6) * line.qty;
      acc.m3 += (match?.m3 ?? 0.02) * line.qty;
      return acc;
    },
    { kg: 0, m3: 0 }
  );
}