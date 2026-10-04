import React from 'react';
import type { Order } from '../../types/orders';
import { Card } from '../ui/Card';
import { formatTime24 } from '../../utils/time';
import { relativeDay } from '../../utils/format';

const POD_PHOTO = "/20f5b2f1-6439-49ff-a85e-ff8d80491cd8.jpg";

export function ProofOfDelivery({ order }: {order: Order;}) {
  const time = order.deliveredAt ? formatTime24(order.deliveredAt) : '—';
  const driver = order.vehicle?.driver ?? 'Driver';

  return (
    <Card className="p-4 md:p-6 lg:sticky lg:top-24">
      <h2 className="text-base font-semibold text-ink">Driver’s proof of delivery</h2>
      <figure className="mt-4">
        <img src={POD_PHOTO} alt="Wrapped pallet of cases left inside the outlet's receiving door" className="aspect-[4/3] w-full rounded-lg object-cover" />
        <figcaption className="mt-2 text-xs text-subtle">
          Photo taken by {driver} · {relativeDay(order.requestedDate)}, {time}
        </figcaption>
      </figure>
      <div className="mt-4 rounded-lg border border-line p-4">
        <p className="text-xs text-subtle">Signature</p>
        <svg viewBox="0 0 220 70" className="mt-1 h-14 w-full" role="img" aria-label={`Signature of ${order.pod?.receivedBy ?? 'recipient'}`}>
          <path
            d="M10 48 C 24 12, 44 10, 48 38 S 70 66, 86 32 S 110 8, 120 42 S 150 58, 164 28 L 176 40 C 186 48, 200 36, 212 30"
            fill="none"
            stroke="#111111"
            strokeWidth="2"
            strokeLinecap="round" />
          
        </svg>
        <p className="border-t border-dashed border-line pt-2 text-sm font-medium text-ink">{order.pod?.receivedBy ?? 'Receiving staff'}</p>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-subtle">Delivered</dt>
          <dd className="font-medium text-ink">
            {relativeDay(order.requestedDate)}, {time}
          </dd>
        </div>
        {order.vehicle &&
        <div className="flex justify-between gap-4">
            <dt className="text-subtle">Driver</dt>
            <dd className="text-right font-medium text-ink">
              {order.vehicle.driver} · {order.vehicle.plate}
            </dd>
          </div>
        }
        {order.pod &&
        <div className="flex justify-between gap-4">
            <dt className="text-subtle">Location</dt>
            <dd className="text-right font-medium text-ink">{order.pod.location}</dd>
          </div>
        }
      </dl>
    </Card>);

}