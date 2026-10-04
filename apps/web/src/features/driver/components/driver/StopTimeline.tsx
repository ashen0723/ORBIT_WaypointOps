import React from 'react';
import { CheckIcon, MapPinnedIcon, SnowflakeIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDriver } from '../../contexts/DriverContext';
import type { DriverTrip } from '../../types/driver';
import { windowStatus } from '../../utils/driverTime';
import { DriverStatusChip } from './DriverStatusChip';
import { SyncIndicator } from './SyncIndicator';

const WINDOW_STYLES = {
  'On time': 'bg-brand-pale text-forest',
  'At risk': 'bg-amber-pale text-amber-ink',
  Late: 'bg-danger-pale text-danger-ink'
};

interface StopTimelineProps {
  trip: DriverTrip;
  selectedSequence?: number;
}

export function StopTimeline({ trip, selectedSequence }: StopTimelineProps) {
  const { getStopRecord, getNextStopSequence } = useDriver();
  const nextSequence = getNextStopSequence(trip.id);
  const resolved = ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'];
  const activeSequence = selectedSequence ?? nextSequence;

  return (
    <ol className="space-y-3" aria-label="Stops in delivery order">
      {trip.stops.map((stop) => {
        const record = getStopRecord(trip.id, stop.sequence);
        const complete = resolved.includes(record.status);
        const next = stop.sequence === nextSequence;
        const selected = stop.sequence === activeSequence;
        const timing = windowStatus(stop.eta, stop.window);
        return (
          <li key={stop.outletId} className={`relative rounded-card border p-4 ${next ? 'border-brand bg-brand-pale shadow-card' : complete ? 'border-brand/20 bg-brand-pale/40' : 'border-line bg-surface'} ${selected ? 'md:ring-2 md:ring-inset md:ring-forest' : ''}`}>
            <div className="flex gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${complete ? 'bg-forest text-white' : next ? 'bg-brand text-white' : 'bg-canvas text-subtle'}`}>
                {complete && record.status !== 'Changed by dispatcher' ? <CheckIcon aria-hidden className="h-5 w-5" /> : stop.sequence}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/trips/${trip.id}/stops/${stop.sequence}`}
                  aria-current={selected ? 'true' : undefined}
                  className="flex min-h-12 flex-wrap items-start justify-between gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  
                  <span className="min-w-0"><span className="block font-semibold leading-5 text-ink">{stop.name}</span><span className="mt-1 block text-xs text-subtle">{stop.outletId}</span></span>
                  <DriverStatusChip status={record.status} />
                </Link>
                {!complete &&
                <div className="mt-3 space-y-2 text-sm text-subtle">
                    <div className="flex items-center justify-between gap-2"><span>{stop.window} window</span><span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${WINDOW_STYLES[timing]}`}>{timing}</span></div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {stop.eta && <span>ETA {stop.eta}</span>}
                      <span className="inline-flex items-center gap-1"><StoreIcon aria-hidden className="h-3.5 w-3.5" />{stop.unloading}</span>
                      {stop.access === 'van_only' && <span className="rounded-full bg-canvas px-2 py-1 font-semibold text-ink"><TruckIcon aria-hidden className="mr-1 inline h-3 w-3" />Van only</span>}
                      {stop.access === 'mall_dock' && <span className="rounded-full bg-amber-pale px-2 py-1 font-semibold text-amber-ink">Mall dock</span>}
                      {stop.chilledCases > 0 && <span className="inline-flex items-center gap-1 font-semibold text-blue-ink"><SnowflakeIcon aria-hidden className="h-3.5 w-3.5" />{stop.chilledCases} chilled</span>}
                    </div>
                  </div>
                }
                {record.syncState && <div className="mt-3"><SyncIndicator state={record.syncState} /></div>}
                {next && record.status !== 'Changed by dispatcher' &&
                <Link to={`/trips/${trip.id}/stops/${stop.sequence}`} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                    <MapPinnedIcon aria-hidden className="h-4 w-4" />Go to stop
                  </Link>
                }
              </div>
            </div>
          </li>);

      })}
    </ol>);

}