import React from 'react';
import { CheckIcon, Clock3Icon, PackageCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { useDriver } from '../../contexts/DriverContext';
import { TRIP_ONE } from '../../data/driver';

export function DriverActivityList() {
  const { getStopRecord } = useDriver();
  const activities = TRIP_ONE.stops.slice(0, 4).map((stop) => {
    const record = getStopRecord(TRIP_ONE.id, stop.sequence);
    const resolved = ['Delivered', 'Partially delivered', 'Failed'].includes(record.status);
    return { stop, record, resolved };
  });

  return (
    <section className="rounded-panel bg-surface p-5 shadow-card" aria-labelledby="activity-heading">
      <div className="flex items-center justify-between gap-3"><div><h2 id="activity-heading" className="text-lg font-semibold text-ink">Delivery activity</h2><p className="mt-1 text-sm text-subtle">Latest records from this route</p></div><span className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-subtle">Live</span></div>
      <ul className="mt-4 space-y-3">
        {activities.map(({ stop, record, resolved }) => {
          const Icon = record.status === 'Failed' ? TriangleAlertIcon : resolved ? CheckIcon : record.status === 'Arrived' ? PackageCheckIcon : Clock3Icon;
          return (
            <li key={stop.outletId} className={`flex items-center gap-3 rounded-card p-3 ${resolved ? 'bg-brand-pale/70' : 'bg-canvas'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${resolved ? 'bg-surface text-forest' : 'bg-surface text-subtle'}`}><Icon aria-hidden className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{stop.outletId} · {stop.name}</p><p className="mt-1 text-xs text-subtle">{record.completedAt ? `Recorded ${record.completedAt}` : `ETA ${stop.eta}`}</p></div>
              <span className="whitespace-nowrap text-xs font-semibold text-forest">{record.status}</span>
            </li>);

        })}
      </ul>
    </section>);

}