import React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { StatusBadge } from '../dispatch/StatusBadge';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Stop, Trip } from '../../types/dispatch';
import { formatClock } from '../../utils/clock';
import { outletLabel } from '../../utils/format';
import { currentStop, hasOpenDelay, stopBadge, stopEta } from '../../utils/status';
import { to12h } from '../../utils/time';

function detail(s: Stop): string {
  if (s.status === 'delivered') return `Delivered ${s.completedAt ? formatClock(s.completedAt) : ''} · ${s.deliveredUnits} units${s.damagedUnits ? `, ${s.damagedUnits} damaged` : ''}${s.pod ? ` · signed by ${s.pod.recipientName}` : ''}`;
  if (s.status === 'failed') return `Attempt failed: ${s.failedReason}`;
  if (s.status === 'deferred') return s.failedReason || 'Deferred to another day';
  if (s.status === 'arrived') return `Arrived ${s.arrivedAt ? formatClock(s.arrivedAt) : ''} · unloading`;
  return `ETA ${to12h(stopEta(s))}${s.revisedArrival ? ` (planned ${to12h(s.plannedArrival)})` : ''}`;
}

export function StopList({ trip }: {trip: Trip;}) {
  const { getOutlet } = useDispatch();
  const current = currentStop(trip);

  return (
    <ol>
      {trip.stops.map((s, i) => {
        const isCurrent = current?.orderId === s.orderId;
        const done = s.status === 'delivered';
        const bad = s.status === 'failed';
        return (
          <li key={s.orderId} className="relative flex gap-4 pb-6 last:pb-0">
            {i < trip.stops.length - 1 && <span aria-hidden="true" className={`absolute left-4 top-9 h-[calc(100%-2.25rem)] w-0.5 ${done ? 'bg-brand' : 'bg-line'}`} />}
            <span
              className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
              done ? 'bg-forest text-white' : bad ? 'bg-danger text-white' : isCurrent ? hasOpenDelay(s) ? 'bg-danger text-white' : 'bg-surface text-forest ring-2 ring-forest' : 'bg-canvas text-subtle ring-1 ring-inset ring-line'}`
              }>
              
              {done ? <CheckIcon aria-hidden="true" className="h-4 w-4" /> : bad ? <XIcon aria-hidden="true" className="h-4 w-4" /> : s.seq}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{outletLabel(getOutlet(s.outletId))}</p>
                <p className="mt-0.5 text-sm text-subtle">
                  {s.orderId} · {detail(s)}
                </p>
                {s.note && <p className="mt-0.5 text-sm text-ink">Driver note: {s.note}</p>}
              </div>
              <StatusBadge badge={stopBadge(s)} />
            </div>
          </li>);

      })}
    </ol>);

}