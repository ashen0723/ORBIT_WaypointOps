import React from 'react';
import { Clock3Icon, MapPinnedIcon, PackageIcon, SnowflakeIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DriverTrip } from '../../types/driver';
import { useDriver } from '../../contexts/DriverContext';
import { DriverStatusChip } from './DriverStatusChip';

export function TripCard({ trip }: {trip: DriverTrip;}) {
  const { getTripStatus, getStopRecord } = useDriver();
  const completed = trip.stops.filter((stop) => ['Delivered', 'Partially delivered', 'Failed', 'Changed by dispatcher'].includes(getStopRecord(trip.id, stop.sequence).status)).length;
  const totalCases = trip.stops.reduce((sum, stop) => sum + stop.cases, 0);
  const chilledCases = trip.stops.reduce((sum, stop) => sum + stop.chilledCases, 0);
  const tinted = trip.number === 2;

  return (
    <article className={`flex h-full flex-col rounded-card p-4 shadow-card ${tinted ? 'bg-brand-pale text-forest' : 'bg-surface text-ink'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold ${tinted ? 'text-forest/70' : 'text-subtle'}`}>Trip {trip.number}</p>
          <h2 className="mt-1 text-lg font-bold">{trip.brand}</h2>
          <p className={`mt-1 text-sm ${tinted ? 'text-forest/75' : 'text-subtle'}`}>{trip.district}</p>
        </div>
        <DriverStatusChip status={getTripStatus(trip.id)} />
      </div>
      <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-3 text-sm ${tinted ? 'border-brand/20 text-forest/75' : 'border-line text-subtle'}`}>
        <span className="flex items-center gap-1.5"><Clock3Icon aria-hidden className="h-4 w-4" />{trip.departure}</span>
        <span className="flex items-center gap-1.5"><MapPinnedIcon aria-hidden className="h-4 w-4" />{trip.stops.length} stops</span>
        <span className="flex items-center gap-1.5"><PackageIcon aria-hidden className="h-4 w-4" />{totalCases} {trip.brand.includes('Style') ? 'cartons' : 'cases'}{chilledCases > 0 && <span className="inline-flex items-center gap-1 font-semibold text-blue-ink">· {chilledCases} chilled <SnowflakeIcon aria-label="Chilled" className="h-4 w-4" /></span>}</span>
      </div>
      <div className="mt-4">
        <div className={`flex items-center justify-between text-xs font-semibold ${tinted ? 'text-forest/75' : 'text-subtle'}`}><span>Progress</span><span>{completed}/{trip.stops.length}</span></div>
        <div className={`mt-2 h-2 overflow-hidden rounded-full ${tinted ? 'bg-surface/70' : 'bg-canvas'}`}><div className="h-full rounded-full bg-brand" style={{ width: `${completed / trip.stops.length * 100}%` }} /></div>
      </div>
      <div className="mt-auto pt-4"><Link to={`/trips/${trip.id}/check`} className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tinted ? 'bg-forest text-white' : 'border border-line bg-surface text-ink hover:bg-canvas'}`}>{trip.number === 1 ? 'Start Trip 1 check' : 'View Trip 2'}</Link></div>
    </article>);

}