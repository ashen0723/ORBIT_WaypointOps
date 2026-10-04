import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MapPinIcon } from 'lucide-react';
import { buttonStyles } from '../ui/Button';
import { StatusBadge } from '../dispatch/StatusBadge';
import { StopProgress } from './StopProgress';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Trip } from '../../types/dispatch';
import { formatDate } from '../../utils/clock';
import { outletLabel, tripLabel } from '../../utils/format';
import { currentStop, hasOpenDelay, MONITOR_BADGE, stopEta, tripMonitorState } from '../../utils/status';
import { to12h } from '../../utils/time';

export function TripStatusCard({ trip }: {trip: Trip;}) {
  const { getOutlet, getDriver } = useDispatch();
  const state = tripMonitorState(trip);
  const stop = currentStop(trip);

  return (
    <article className={`flex h-full flex-col rounded-card bg-surface p-5 shadow-card ${state === 'delayed' ? 'ring-2 ring-danger/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{tripLabel(trip.number)}</h3>
          <p className="text-sm text-subtle">
            {trip.vehicleId} · {getDriver(trip.driverId)?.name ?? trip.driverId} · {formatDate(trip.date)}
          </p>
        </div>
        <StatusBadge badge={MONITOR_BADGE[state]} />
      </div>
      <div className="mt-4">
        <StopProgress stops={trip.stops} />
      </div>
      {stop &&
      <p className="mt-3 flex items-center gap-1.5 text-sm text-ink">
          <MapPinIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle" />
          {stop.status === 'arrived' ? 'At' : hasOpenDelay(stop) ? 'Delayed to' : 'Heading to'} {outletLabel(getOutlet(stop.outletId))} · ETA {to12h(stopEta(stop))}
        </p>
      }
      <div className="mt-auto pt-5">
        <Link to={`/monitoring/${trip.id}`} className={`${buttonStyles(state === 'delayed' ? 'primary' : 'secondary', 'md')} w-full`}>
          {state === 'delayed' ? 'View Issue' : 'View Trip'}
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </article>);

}