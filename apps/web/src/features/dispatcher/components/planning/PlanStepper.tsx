import React from 'react';
import { CheckIcon } from 'lucide-react';

const STEPS = ['Select Orders', 'Choose Vehicle', 'Review', 'Confirm'];

export function PlanStepper({ current, done = false }: {current: number;done?: boolean;}) {
  return (
    <ol aria-label="Trip planning steps" className="flex items-center gap-2 overflow-x-auto md:gap-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = done || n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined} className="flex shrink-0 items-center gap-2 md:gap-3">
            {i > 0 && <span aria-hidden="true" className={`h-0.5 w-5 rounded-full md:w-10 ${state === 'todo' ? 'bg-line' : 'bg-forest'}`} />}
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
              state === 'done' ? 'bg-forest text-white' : state === 'current' ? 'bg-forest text-white ring-4 ring-brand-pale' : 'bg-surface text-subtle ring-1 ring-inset ring-line'}`
              }>
              
              {state === 'done' ? <CheckIcon aria-hidden="true" className="h-4 w-4" /> : n}
            </span>
            <span className={`whitespace-nowrap text-sm font-semibold ${state === 'todo' ? 'text-subtle' : 'text-ink'}`}>{label}</span>
          </li>);

      })}
    </ol>);

}