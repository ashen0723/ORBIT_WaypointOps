import React from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { useDriver } from '../../contexts/DriverContext';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { ConnectionPill } from '../driver/ConnectionPill';

export function DriverSessionCard() {
  const { connection, lastSyncedAt, departedTrips } = useDriver();
  const queue = useSyncQueue();
  const active = Boolean(departedTrips['trip-1']);
  return (
    <section className="relative overflow-hidden rounded-panel bg-forest p-5 text-white shadow-card" aria-labelledby="session-heading">
      <div className="flex items-start justify-between gap-3"><div><h2 id="session-heading" className="text-lg font-semibold">Driver session</h2><p className="mt-1 text-sm text-brand-pale">Trip 1 · Kandy district</p></div><ConnectionPill connection={connection} /></div>
      <p className="mt-8 text-4xl font-semibold tracking-tight tabular-nums">{active ? '02:58:00' : '00:00:00'}</p>
      <p className="mt-1 text-xs text-brand-pale">{active ? 'Time on route' : 'Starts when Trip 1 departs'}</p>
      <div className="mt-8 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-forest">{active ? <PauseIcon aria-hidden className="h-5 w-5" /> : <PlayIcon aria-hidden className="h-5 w-5" />}</span>
        <div><p className="text-sm font-semibold">{queue.total ? `${queue.total} items waiting` : 'All records synced'}</p><p className="mt-1 text-xs text-brand-pale">Last synced {lastSyncedAt}</p></div>
      </div>
    </section>);

}