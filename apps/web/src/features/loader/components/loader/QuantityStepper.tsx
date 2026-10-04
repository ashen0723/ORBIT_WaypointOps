import React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';

interface QuantityStepperProps {
  value: number;

  /**
   * Optional because the real maximum may eventually come from
   * backend validation rather than a hardcoded UI value.
   */
  maximum?: number;

  minimum?: number;

  onChange: (value: number) => void;

  label: string;

  disabled?: boolean;
}

export function QuantityStepper({
  value,
  maximum,
  minimum = 0,
  onChange,
  label,
  disabled = false,
}: QuantityStepperProps) {
  const clampValue = (nextValue: number) => {
    let next = Math.max(minimum, Math.trunc(nextValue));

    if (typeof maximum === 'number') {
      next = Math.min(maximum, next);
    }

    return next;
  };

  const updateValue = (nextValue: number) => {
    onChange(clampValue(nextValue));
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawValue = event.target.value;

    if (rawValue === '') {
      onChange(minimum);
      return;
    }

    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    updateValue(parsedValue);
  };

  const atMinimum = value <= minimum;

  const atMaximum =
    typeof maximum === 'number' && value >= maximum;

  return (
    <div
      className="inline-flex h-12 items-center rounded-full border border-line/80 bg-surface p-1 shadow-card"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => updateValue(value - 1)}
        disabled={disabled || atMinimum}
        aria-label="Decrease loaded quantity"
        className="grid h-10 w-10 place-items-center rounded-full text-subtle transition-[background-color,color,transform] duration-150 hover:bg-canvas hover:text-ink active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:text-hatch"
      >
        <MinusIcon
          aria-hidden="true"
          className="h-4 w-4"
        />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={minimum}
        max={maximum}
        step={1}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        aria-label={label}
        className="h-9 w-16 rounded-full border-0 bg-canvas px-2 text-center text-base font-semibold tabular-nums text-ink outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:text-muted"
      />

      <button
        type="button"
        onClick={() => updateValue(value + 1)}
        disabled={disabled || atMaximum}
        aria-label="Increase loaded quantity"
        className="grid h-10 w-10 place-items-center rounded-full text-subtle transition-[background-color,color,transform] duration-150 hover:bg-brand-pale hover:text-forest active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:text-hatch"
      >
        <PlusIcon
          aria-hidden="true"
          className="h-4 w-4"
        />
      </button>
    </div>
  );
}