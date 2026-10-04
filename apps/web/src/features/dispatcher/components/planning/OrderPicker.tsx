import React, { useState } from 'react';
import { InfoIcon, PlusIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BrandTag, TempTag, VanOnlyTag } from '../dispatch/BrandTag';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Order } from '../../types/dispatch';
import { formatDate } from '../../utils/clock';
import { formatKg, formatM3, formatWindow } from '../../utils/format';
import { comparePriority, PRIORITY_POLICY, priorityReason } from '../../utils/priority';
import { TEMPERATURE_LABEL } from '../../utils/vehicle';

interface OrderPickerProps {
  emphasize: boolean;
  tripOrders: Order[];
  onBlocked: (orderIds: string[]) => void;
}

export function OrderPicker({ emphasize, tripOrders, onBlocked }: OrderPickerProps) {
  const { orders, draft, addToDraft, getOutlet, getDepot } = useDispatch();
  const [selected, setSelected] = useState<string[]>([]);
  const [showPolicy, setShowPolicy] = useState(false);
  const temp = tripOrders[0]?.temperature;

  const available = orders.filter((o) => o.status === 'pending' && o.depotId === draft.depotId && o.plannedDate === draft.date && !draft.orderIds.includes(o.id)).sort(comparePriority);
  const picked = selected.filter((id) => available.some((o) => o.id === id));

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const add = () => {
    const blocked = addToDraft(picked);
    setSelected([]);
    if (blocked.length) onBlocked(blocked);
  };

  return (
    <Card className="flex flex-col lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
      <div className="border-b border-line p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Orders to Plan</h2>
            <p className="mt-0.5 text-sm text-subtle">
              {available.length} waiting · {getDepot(draft.depotId)?.name} · {draft.date ? formatDate(draft.date) : '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPolicy((s) => !s)}
            aria-expanded={showPolicy}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-subtle hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            
            <InfoIcon aria-hidden="true" className="h-3.5 w-3.5" />
            Order of list
          </button>
        </div>
        {showPolicy &&
        <ol className="mt-3 list-decimal space-y-0.5 rounded-2xl bg-canvas py-2 pl-8 pr-3 text-sm text-ink">
            {PRIORITY_POLICY.map((p) =>
          <li key={p}>{p}</li>
          )}
          </ol>
        }
        <p className="mt-3 rounded-2xl bg-canvas px-3 py-2 text-sm text-ink">
          <span className="font-semibold">One storage temperature per trip.</span> <span className="text-subtle">{temp ? `This trip: ${TEMPERATURE_LABEL[temp]}` : 'The first order sets it.'}</span>
        </p>
      </div>

      {available.length === 0 ?
      <p className="p-8 text-center text-sm text-subtle">No orders waiting for this date and depot. Try another date.</p> :

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {available.map((o) => {
          const checked = picked.includes(o.id);
          const outlet = getOutlet(o.outletId);
          const prio = priorityReason(o);
          const clash = temp && o.temperature !== temp;
          return (
            <li key={o.id}>
                <label className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition-colors duration-150 ${checked ? 'border-brand bg-brand-pale/60' : 'border-line hover:bg-canvas'} ${clash ? 'opacity-60' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.id)} className="mt-1 h-4 w-4 shrink-0 accent-[#1B6B3F]" aria-describedby={`pick-${o.id}`} />
                  <div className="min-w-0 flex-1" id={`pick-${o.id}`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold tabular-nums text-ink">{o.id}</span>
                      <BrandTag brand={o.brand} />
                      <TempTag temperature={o.temperature} />
                      {outlet?.vanOnly && <VanOnlyTag />}
                      {prio && <span className="rounded-full bg-amber px-2 py-0.5 text-[11px] font-semibold text-ink">{prio}</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-ink">
                      {outlet?.name} <span className="text-subtle">· {outlet?.area}</span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-subtle">
                      {formatWindow(o.windowStart, o.windowEnd)} · {o.units} u · {formatKg(o.weightKg)} · {formatM3(o.volumeM3)}
                    </p>
                  </div>
                </label>
              </li>);

        })}
        </ul>
      }

      <div className="flex items-center justify-between gap-3 border-t border-line p-4">
        <span className="text-sm text-subtle">
          <span className="font-semibold tabular-nums text-ink">{picked.length}</span> selected
        </span>
        <Button variant={emphasize ? 'primary' : 'outline'} size="lg" disabled={picked.length === 0} onClick={add}>
          <PlusIcon aria-hidden="true" className="h-5 w-5" />
          Add to Trip
        </Button>
      </div>
    </Card>);

}