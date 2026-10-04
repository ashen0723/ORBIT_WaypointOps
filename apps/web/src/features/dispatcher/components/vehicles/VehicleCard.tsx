import React from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../dispatch/StatusBadge';
import { TempTag } from '../dispatch/BrandTag';
import { useDispatch } from '../../contexts/DispatchContext';
import { MAX_TRIPS_PER_VEHICLE_PER_DAY } from '../../data/rules';
import type { Vehicle } from '../../types/dispatch';
import { formatNumber } from '../../utils/format';
import { VEHICLE_BADGE, VehicleState } from '../../utils/status';

interface VehicleCardProps {
  vehicle: Vehicle;
  state: VehicleState;
  tripsUsed: number;
  onView: () => void;
}

export function VehicleCard({ vehicle, state, tripsUsed, onView }: VehicleCardProps) {
  const { getDepot } = useDispatch();
  return (
    <article className="flex h-full flex-col rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-lg font-semibold text-ink">
            {vehicle.id} <TempTag temperature={vehicle.refrigeration} />
          </h3>
          <p className="text-sm text-subtle">
            {vehicle.type} · {getDepot(vehicle.depotId)?.name}
          </p>
        </div>
        <StatusBadge badge={VEHICLE_BADGE[state]} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-subtle">Capacity</dt>
          <dd className="font-semibold tabular-nums text-ink">
            {formatNumber(vehicle.capacityKg)} kg / {vehicle.capacityM3} m³
          </dd>
        </div>
        <div>
          <dt className="text-xs text-subtle">Trips that day</dt>
          <dd className="flex items-center gap-2 font-semibold tabular-nums text-ink">
            {tripsUsed} / {MAX_TRIPS_PER_VEHICLE_PER_DAY}
            <span aria-hidden="true" className="flex gap-1">
              {Array.from({ length: MAX_TRIPS_PER_VEHICLE_PER_DAY }).map((_, i) =>
              <span key={i} className={`h-2 w-4 rounded-full ${i < tripsUsed ? 'bg-forest' : 'bg-canvas ring-1 ring-inset ring-line'}`} />
              )}
            </span>
          </dd>
        </div>
      </dl>
      <div className="mt-auto pt-5">
        <Button variant="secondary" fullWidth onClick={onView}>
          View Vehicle
        </Button>
      </div>
    </article>);

}