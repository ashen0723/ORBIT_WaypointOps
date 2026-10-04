import React, { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  selectedClassName?: string;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange, selectedClassName }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-canvas p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:text-hatch ${
            selected ? selectedClassName ?? 'bg-surface text-ink shadow-card' : 'text-subtle hover:text-ink'}`
            }>
            
            {option.icon}
            {option.label}
          </button>);

      })}
    </div>);

}