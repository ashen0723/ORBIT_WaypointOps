import React from 'react';
import { PackageIcon, SnowflakeIcon } from 'lucide-react';
import { useDriver } from '../../contexts/DriverContext';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import type { DriverTrip } from '../../types/driver';
import { Card } from '../ui/Card';
import { StateBanner } from './StateBanner';
import { SyncIndicator } from './SyncIndicator';

export function RouteSidePanel({ trip }: {trip: DriverTrip;}) {
  const { connection, lastSyncedAt, getStopRecord } = useDriver();
  const queue = useSyncQueue();
  const totalCases = trip.stops.reduce((sum, stop) => sum + stop.cases, 0);
  const chilledCases = trip.stops.reduce((sum, stop) => sum + stop.chilledCases, 0);

  return (
    <div className="space-y-4">
      {connection === 'offline' &&
      <Card className="border border-amber/40 p-4">
          <p className="font-semibold text-ink">Waiting to sync</p>
          <p className="mt-2 text-sm text-subtle">{queue.deliveries} deliveries, {queue.photos} photos, {queue.issues} issue report</p>
          <p className="mt-1 text-xs text-subtle">Last synced {lastSyncedAt}</p>
        </Card>
      }

      <Card className="p-4">
        <h2 className="font-bold text-ink">Trip manifest</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-subtle">
          <PackageIcon aria-hidden className="h-4 w-4" />{totalCases} cases
          {chilledCases > 0 && <span className="inline-flex items-center gap-1 font-semibold text-blue-ink">· {chilledCases} chilled <SnowflakeIcon aria-label="Chilled" className="h-4 w-4" /></span>}
        </p>
        <ul className="mt-3 divide-y divide-line">
          {trip.stops.map((stop) =>
          <li key={stop.outletId} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-5 font-bold text-subtle">{stop.sequence}</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{stop.outletId}</span>
              <span className="text-subtle">{stop.cases}</span>
              {stop.chilledCases > 0 && <span className="inline-flex w-10 items-center justify-end gap-0.5 text-xs font-semibold text-blue-ink"><SnowflakeIcon aria-hidden className="h-3.5 w-3.5" />{stop.chilledCases}</span>}
            </li>
          )}
        </ul>
      </Card>

      {trip.loaderFlag && <StateBanner tone="danger" title="Loader flag" detail={trip.loaderFlag} />}

      <Card className="p-4">
        <h2 className="font-bold text-ink">Record sync status</h2>
        <ul className="mt-3 divide-y divide-line">
          {trip.stops.map((stop) => {
            const record = getStopRecord(trip.id, stop.sequence);
            return (
              <li key={stop.outletId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-semibold text-ink">Stop {stop.sequence}</span>
                {record.syncState ? <SyncIndicator state={record.syncState} /> : <span className="text-xs text-muted">{record.status === 'Changed by dispatcher' ? 'Moved by dispatcher' : 'No record yet'}</span>}
              </li>);

          })}
          {queue.issues > 0 &&
          <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-semibold text-ink">Issue report</span>
              <SyncIndicator state="Saved on phone" />
            </li>
          }
        </ul>
      </Card>
    </div>);

}