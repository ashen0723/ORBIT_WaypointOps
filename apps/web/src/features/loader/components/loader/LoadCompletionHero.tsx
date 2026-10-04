import React from 'react';
import { CheckIcon } from 'lucide-react';

interface LoadCompletionHeroProps {
  vehicleId: string;
  title: string;
  subtitle: string;
}

export function LoadCompletionHero({ vehicleId, title, subtitle }: LoadCompletionHeroProps) {
  return (
    <div className="relative overflow-hidden bg-forest px-6 py-9 text-center text-white md:px-10 md:py-11">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-brand-mint" />
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25 shadow-card">
        <CheckIcon aria-hidden="true" className="h-7 w-7" strokeWidth={3} />
      </span>
      <p className="mt-5 text-[38px] font-semibold leading-none tabular-nums tracking-tight">{vehicleId}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[32px]">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/75">{subtitle}</p>
    </div>);

}