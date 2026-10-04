import React from 'react';
import { formatNumber } from '../../utils/format';

interface CapacityBarProps {
  label: string;
  used: number;
  capacity?: number;
  unit: string;
}

export function CapacityBar({ label, used, capacity, unit }: CapacityBarProps) {
  const over = capacity !== undefined && used > capacity;
  const pct = capacity ? Math.min(100, used / capacity * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-subtle">{label}</span>
        <span className={`font-semibold tabular-nums ${over ? 'text-danger-ink' : 'text-ink'}`}>
          {formatNumber(used)}
          {capacity !== undefined ? ` / ${formatNumber(capacity)}` : ''} {unit}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
        {capacity !== undefined &&
        <div className={`h-full rounded-full transition-[width] duration-200 ease-out ${over ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
        }
      </div>
    </div>);

}