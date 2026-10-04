import React from 'react';
import { Card } from '../ui/Card';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Stop } from '../../types/dispatch';
import { outletLabel } from '../../utils/format';
import { to12h } from '../../utils/time';

/** Loaders pack last-stop-first, so the sequence is shown with the loading order alongside. */
export function StopSequence({ stops }: {stops: Stop[];}) {
  const { getOutlet } = useDispatch();
  return (
    <Card className="mt-6 p-5 md:p-6">
      <h2 className="text-lg font-semibold text-ink">Delivery sequence</h2>
      <p className="text-sm text-subtle">Load the last stop first so the first stop is at the door.</p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stops.map((s) =>
        <li key={s.orderId} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-semibold text-white">{s.seq}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{outletLabel(getOutlet(s.outletId))}</span>
              <span className="block text-xs text-subtle">
                {s.orderId} · ETA {to12h(s.plannedArrival)} · load {stops.length - s.seq + 1}
                {stops.length - s.seq + 1 === 1 ? 'st' : stops.length - s.seq + 1 === 2 ? 'nd' : stops.length - s.seq + 1 === 3 ? 'rd' : 'th'}
              </span>
            </span>
          </li>
        )}
      </ol>
    </Card>);

}