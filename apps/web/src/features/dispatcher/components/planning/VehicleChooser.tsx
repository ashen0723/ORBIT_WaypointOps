import React, { useRef } from 'react';
import { CheckIcon, TruckIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from '../dispatch/StatusBadge';
import { TempTag } from '../dispatch/BrandTag';
import { VehicleCheckResult } from './VehicleCheckResult';
import { useDispatch } from '../../contexts/DispatchContext';
import { MAX_TRIPS_PER_VEHICLE_PER_DAY } from '../../data/rules';
import type { Order } from '../../types/dispatch';
import { validateTrip, vehicleDayTrips, type TripValidation } from '../../utils/tripValidation';
import { formatKg, formatM3 } from '../../utils/format';
import { VEHICLE_BADGE, vehicleState } from '../../utils/status';

interface VehicleChooserProps {
  tripOrders: Order[];
  /** The authoritative result for the selected vehicle — the same object drives badges and Confirm. */
  selectedResult: TripValidation | null;
  onReview: () => void;
  onEditTrip: () => void;
}

export function VehicleChooser({ tripOrders, selectedResult, onReview, onEditTrip }: VehicleChooserProps) {
  const { vehicles, trips, draft, updateDraft, planContext, getDriver } = useDispatch();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const disabled = tripOrders.length === 0;

  const options = vehicles.
  filter((v) => v.depotId === draft.depotId).
  map((v) => {
    const selected = draft.vehicleId === v.id;
    const result =
    selected && selectedResult ?
    selectedResult :
    validateTrip(planContext, { date: draft.date, depotId: draft.depotId, orderIds: draft.orderIds, vehicleId: v.id, driverId: null, departAt: null });
    return { v, selected, result, used: vehicleDayTrips(trips, v.id, draft.date).length, state: vehicleState(v, trips, draft.date) };
  }).
  sort((a, b) => Number(b.result.ok) - Number(a.result.ok) || a.result.issues.length - b.result.issues.length);

  const chooseAnother = () => {
    updateDraft({ vehicleId: null, driverId: null, departAt: null });
    headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Card className="scroll-mt-28 p-5 md:p-6">
      <h2 ref={headingRef} className="scroll-mt-28 text-lg font-semibold text-ink">
        Choose Vehicle
      </h2>
      <p className="mt-0.5 text-sm text-subtle">{disabled ? 'Add orders to the trip first.' : 'Every vehicle is checked against all rules · passing vehicles first'}</p>

      <ul className={`mt-4 space-y-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={disabled}>
        {options.map(({ v, selected, result, used, state }) => {
          const fits = result.ok;
          return (
            <li key={v.id} className={`rounded-2xl border p-4 transition-colors duration-150 ${selected ? fits ? 'border-brand' : 'border-danger' : 'border-line'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-ink">
                  <TruckIcon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{v.id}</span>
                    <span className="text-sm text-subtle">{v.type}</span>
                    <TempTag temperature={v.refrigeration} />
                    {!disabled && !selected && (fits ? <span className="rounded-full bg-brand-pale px-2 py-0.5 text-[11px] font-semibold text-forest">Passes all checks</span> : <span className="text-[11px] font-semibold text-danger-ink">{result.issues[0]?.title}</span>)}
                  </p>
                  <p className="mt-0.5 text-sm tabular-nums text-subtle">
                    {formatKg(v.capacityKg)} · {formatM3(v.capacityM3)} · Trips {used}/{MAX_TRIPS_PER_VEHICLE_PER_DAY} · {getDriver(v.defaultDriverId ?? '')?.name ?? 'No driver'}
                  </p>
                </div>
                <StatusBadge badge={VEHICLE_BADGE[state]} size="sm" />
                {selected ?
                <span className="inline-flex h-8 items-center gap-1 px-2 text-sm font-semibold text-ink">
                    <CheckIcon aria-hidden="true" className="h-4 w-4" />
                    Selected
                  </span> :

                <Button variant="outline" size="sm" disabled={disabled} onClick={() => updateDraft({ vehicleId: v.id, driverId: null, departAt: null })}>
                    Select
                  </Button>
                }
              </div>
              {selected && <VehicleCheckResult result={result} onChooseAnother={chooseAnother} onEditTrip={onEditTrip} onReview={onReview} />}
            </li>);

        })}
      </ul>
    </Card>);

}