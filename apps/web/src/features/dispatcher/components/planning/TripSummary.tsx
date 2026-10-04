import React from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { OverflowMenu } from '../ui/OverflowMenu';
import { BrandTag, TempTag } from '../dispatch/BrandTag';
import { CapacityBar } from '../dispatch/CapacityBar';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Order, Vehicle } from '../../types/dispatch';
import type { TripValidation } from '../../utils/tripValidation';
import { formatDate } from '../../utils/clock';
import { formatKg } from '../../utils/format';
import { formatDuration, fromMin, to12h } from '../../utils/time';

interface TripSummaryProps {
  tripOrders: Order[];
  vehicle?: Vehicle;
  result: TripValidation | null;
  next: string;
  onDefer: (orderId: string) => void;
}

export function TripSummary({ tripOrders, vehicle, result, next, onDefer }: TripSummaryProps) {
  const { draft, removeFromDraft, getOutlet, getDepot } = useDispatch();
  const weight = tripOrders.reduce((s, o) => s + o.weightKg, 0);
  const volume = tripOrders.reduce((s, o) => s + o.volumeM3, 0);

  return (
    <Card id="trip-summary" className="scroll-mt-28 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Draft trip</h2>
          <p className="mt-0.5 text-sm text-subtle">
            {getDepot(draft.depotId)?.name} · <span className="font-medium text-ink">{draft.date ? formatDate(draft.date, 'long') : '—'}</span>
            {vehicle &&
            <>
                {' '}
                · <span className="font-medium text-ink">{vehicle.id}</span>
              </>
            }
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-subtle">Orders</p>
          <p className="text-2xl font-semibold leading-none tabular-nums text-ink">{tripOrders.length}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <CapacityBar label="Weight" used={weight} capacity={vehicle?.capacityKg} unit="kg" />
        <CapacityBar label="Volume" used={volume} capacity={vehicle?.capacityM3} unit="m³" />
      </div>

      {result && result.stops.length > 0 &&
      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4 text-sm">
          <div>
            <dt className="text-subtle">Departs</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-ink">{to12h(fromMin(result.departMin))}</dd>
          </div>
          <div>
            <dt className="text-subtle">Back at depot</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-ink">{to12h(fromMin(result.returnMin))}</dd>
          </div>
          <div>
            <dt className="text-subtle">Trip time</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatDuration(result.feasibility.tripMin)}</dd>
          </div>
        </dl>
      }

      {tripOrders.length === 0 ?
      <p className="mt-5 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-subtle">No orders yet. Select orders and click Add to Trip.</p> :

      <ul className="mt-5 divide-y divide-line border-y border-line">
          {tripOrders.map((o) => {
          const outlet = getOutlet(o.outletId);
          return (
            <li key={o.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-semibold tabular-nums text-ink">{o.id}</span>
                    <BrandTag brand={o.brand} />
                    <TempTag temperature={o.temperature} />
                  </p>
                  <p className="truncate text-sm text-subtle">
                    {outlet?.name} · {outlet?.area}
                  </p>
                </div>
                <span className="text-sm tabular-nums text-ink">{formatKg(o.weightKg)}</span>
                <OverflowMenu
                label={`Actions for ${o.id}`}
                items={[
                { label: 'Remove from Trip', onClick: () => removeFromDraft(o.id) },
                { label: 'Defer Order', onClick: () => onDefer(o.id), danger: true }]
                } />
              
              </li>);

        })}
        </ul>
      }

      <p className="mt-5 flex items-center gap-2 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-forest" />
        <span>
          <span className="font-semibold">Next:</span> {next}
        </span>
      </p>
    </Card>);

}