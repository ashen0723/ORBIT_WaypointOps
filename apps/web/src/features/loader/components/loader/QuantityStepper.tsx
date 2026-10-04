import React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
interface QuantityStepperProps {
  value: number;
  maximum: number;
  onChange: (value: number) => void;
  label: string;
}
export function QuantityStepper({
  value,
  maximum,
  onChange,
  label
}: QuantityStepperProps) {
  return <div className="inline-flex h-12 items-center rounded-full border border-line/80 bg-surface p-1 shadow-card" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} aria-label="Decrease loaded quantity" className="grid h-10 w-10 place-items-center rounded-full text-subtle transition-[background-color,color,transform] duration-150 hover:bg-canvas hover:text-ink active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:text-hatch">
        <MinusIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <span className="grid min-w-10 place-items-center rounded-full bg-canvas px-2 py-1.5 text-center text-base font-semibold tabular-nums text-ink">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(maximum, value + 1))} disabled={value === maximum} aria-label="Increase loaded quantity" className="grid h-10 w-10 place-items-center rounded-full text-subtle transition-[background-color,color,transform] duration-150 hover:bg-brand-pale hover:text-forest active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:text-hatch">
        <PlusIcon aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>;
}