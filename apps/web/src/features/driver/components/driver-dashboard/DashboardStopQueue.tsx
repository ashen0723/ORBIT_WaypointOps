import { SnowflakeIcon } from 'lucide-react';
import { useDriver } from '../../contexts/DriverContext';
import { TRIP_ONE } from '../../data/driver';
import { DriverStatusChip } from '../driver/DriverStatusChip';

export function DashboardStopQueue() {
  const { getStopRecord } = useDriver();
  return (
    <section className="rounded-panel bg-surface p-5 shadow-card" aria-labelledby="queue-heading">
      <div className="flex items-center justify-between gap-3"><h2 id="queue-heading" className="text-lg font-semibold text-ink">Trip 1 stops</h2><span className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-subtle">{TRIP_ONE.stops.length} stops</span></div>
      <ol className="mt-4 divide-y divide-line">
        {TRIP_ONE.stops.map((stop) =>
        <li key={stop.outletId} className="flex items-center gap-3 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-sm font-bold text-forest">{stop.sequence}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{stop.name}</p><p className="mt-1 flex items-center gap-2 text-xs text-subtle"><span>{stop.eta}</span><span>{stop.window}</span>{stop.chilledCases > 0 && <span className="inline-flex items-center gap-1 text-blue-ink"><SnowflakeIcon aria-hidden className="h-3.5 w-3.5" />{stop.chilledCases}</span>}</p></div>
            <DriverStatusChip status={getStopRecord(TRIP_ONE.id, stop.sequence).status} />
          </li>
        )}
      </ol>
    </section>);

}