import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';
import { StatusBadge } from '../dispatch/StatusBadge';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Trip } from '../../types/dispatch';
import { formatDate } from '../../utils/clock';
import { lineHasException } from '../../utils/fieldOps';
import { tripLabel } from '../../utils/format';
import { LOADING_BADGE, tripLoadingState } from '../../utils/status';
import { to12h } from '../../utils/time';

export function LoadingTripCard({ trip }: {trip: Trip;}) {
  const { getVehicle, getDriver } = useDispatch();
  const state = tripLoadingState(trip);
  const recorded = trip.load.filter((l) => l.loadedUnits !== null).length;
  const exceptions = trip.load.filter(lineHasException).length;
  const pct = trip.load.length ? recorded / trip.load.length * 100 : 0;

  return (
    <Link to={`/loading/${trip.id}`} className="flex h-full flex-col rounded-card bg-surface p-5 shadow-card transition-shadow duration-150 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{tripLabel(trip.number)}</p>
          <p className="text-sm text-subtle">
            {trip.vehicleId} · {getVehicle(trip.vehicleId)?.type}
          </p>
        </div>
        <StatusBadge badge={LOADING_BADGE[state]} size="sm" />
      </div>
      <p className="mt-3 text-sm text-ink">
        Departs <span className="font-semibold">{to12h(trip.departAt)}</span> · {formatDate(trip.date)}
      </p>
      <p className="text-sm text-subtle">Driver {getDriver(trip.driverId)?.name ?? trip.driverId}</p>
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-subtle">
            {recorded}/{trip.load.length} orders counted
          </span>
          {exceptions > 0 && <span className="font-semibold text-danger-ink">{exceptions} exception{exceptions === 1 ? '' : 's'}</span>}
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4 text-subtle" />
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
          <div className={`h-full rounded-full ${exceptions ? 'bg-amber' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>);

}