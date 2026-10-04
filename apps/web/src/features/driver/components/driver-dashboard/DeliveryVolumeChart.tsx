import React from 'react';
import { TRIP_ONE } from '../../data/driver';

const BAR_TONES = ['hatch-stripes', 'bg-brand-medium', 'bg-brand-mint', 'bg-forest', 'hatch-stripes'];

export function DeliveryVolumeChart() {
  const maxCases = Math.max(...TRIP_ONE.stops.map((stop) => stop.cases));
  const totalCases = TRIP_ONE.stops.reduce((sum, stop) => sum + stop.cases, 0);
  return (
    <section className="rounded-panel bg-surface p-5 shadow-card" aria-labelledby="volume-heading">
      <div className="flex items-end justify-between gap-3">
        <div><h2 id="volume-heading" className="text-lg font-semibold text-ink">Delivery volume</h2><p className="mt-1 text-sm text-subtle">Cases by stop on Trip 1</p></div>
        <span className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-subtle">{totalCases} cases</span>
      </div>
      <div className="mt-6 flex h-48 items-end gap-3 sm:gap-5">
        {TRIP_ONE.stops.map((stop, index) =>
        <div key={stop.outletId} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
            <div className="mb-2 text-xs font-semibold text-subtle">{stop.cases}</div>
            <div className={`mx-auto w-full max-w-14 rounded-t-full rounded-b-xl ${BAR_TONES[index]}`} style={{ height: `${Math.max(28, stop.cases / maxCases * 130)}px` }} />
            <p className="mt-2 truncate text-xs font-semibold text-subtle">{stop.sequence}</p>
          </div>
        )}
      </div>
    </section>);

}