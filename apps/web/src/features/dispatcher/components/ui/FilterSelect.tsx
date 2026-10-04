import React from 'react';
import { ChevronDownIcon } from 'lucide-react';

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly {value: T;label: string;}[];
  onChange: (value: T) => void;
  className?: string;
}

export function FilterSelect<T extends string>({ label, value, options, onChange, className = '' }: FilterSelectProps<T>) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full appearance-none rounded-full border border-line bg-surface pl-4 pr-9 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand">
        
        {options.map((o) =>
        <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )}
      </select>
      <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
    </label>);

}