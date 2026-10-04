import React from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TempTag } from '../dispatch/BrandTag';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Order } from '../../types/dispatch';

interface IncompatibleOrderModalProps {
  orderIds: string[] | null;
  tripOrders: Order[];
  onClose: () => void;
}

export function IncompatibleOrderModal({ orderIds, tripOrders, onClose }: IncompatibleOrderModalProps) {
  const { getOrder, getOutlet } = useDispatch();
  const blocked = (orderIds ?? []).map(getOrder).filter((o): o is Order => Boolean(o));
  const base = tripOrders[0];

  return (
    <Modal open={Boolean(orderIds?.length)} title="Different storage temperature" onClose={onClose}>
      <div className="flex gap-3 rounded-2xl bg-amber-pale p-4">
        <TriangleAlertIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink" />
        <p className="text-sm text-ink">Vehicles carry one temperature at a time. Plan these orders on a separate trip.</p>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        {base &&
        <div className="flex items-center justify-between gap-3">
            <dt className="text-subtle">This trip</dt>
            <dd>
              <TempTag temperature={base.temperature} />
            </dd>
          </div>
        }
        {blocked.map((o) =>
        <div key={o.id} className="flex items-center justify-between gap-3">
            <dt className="text-subtle">
              <span className="font-semibold tabular-nums text-ink">{o.id}</span> · {getOutlet(o.outletId)?.name}
            </dt>
            <dd>
              <TempTag temperature={o.temperature} />
            </dd>
          </div>
        )}
      </dl>
      <Button size="lg" fullWidth className="mt-6" onClick={onClose}>
        OK
      </Button>
    </Modal>);

}