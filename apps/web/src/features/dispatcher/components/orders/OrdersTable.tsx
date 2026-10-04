import React from 'react';
import { BrandTag, TempTag, VanOnlyTag } from '../dispatch/BrandTag';
import { StatusBadge } from '../dispatch/StatusBadge';
import { OrderRowActions } from './OrderRowActions';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Order } from '../../types/dispatch';
import { formatDate } from '../../utils/clock';
import { formatKg, formatM3, formatWindow } from '../../utils/format';
import { orderBadge } from '../../utils/status';

interface OrdersTableProps {
  orders: Order[];
  onPlan: (order: Order) => void;
  onDetails: (orderId: string) => void;
  onDefer: (orderId: string) => void;
}

const TH = 'px-4 py-3 text-left text-xs font-semibold text-subtle';

export function OrdersTable({ orders, onPlan, onDetails, onDefer }: OrdersTableProps) {
  const { tripForOrder, getOutlet } = useDispatch();

  return (
    <>
      <div className="hidden rounded-card bg-surface shadow-card lg:block">
        <table className="w-full">
          <thead className="border-b border-line">
            <tr>
              <th scope="col" className={`${TH} pl-6`}>Order</th>
              <th scope="col" className={TH}>Outlet</th>
              <th scope="col" className={TH}>Brand · storage</th>
              <th scope="col" className={TH}>Delivery</th>
              <th scope="col" className={`${TH} text-right`}>Load</th>
              <th scope="col" className={TH}>Status</th>
              <th scope="col" className={`${TH} pr-6 text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => {
              const outlet = getOutlet(o.outletId);
              return (
                <tr key={o.id} className={o.status === 'pending' ? '' : 'text-subtle'}>
                  <td className="py-3 pl-6 pr-4">
                    <button type="button" onClick={() => onDetails(o.id)} className="rounded font-semibold tabular-nums text-ink hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      {o.id}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{outlet?.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-subtle">
                      {outlet?.area} {outlet?.vanOnly && <VanOnlyTag />}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      <BrandTag brand={o.brand} />
                      <TempTag temperature={o.temperature} />
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <p className="font-medium text-ink">{formatDate(o.plannedDate)}</p>
                    <p className="text-subtle">{formatWindow(o.windowStart, o.windowEnd)}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-ink">
                    {formatKg(o.weightKg)}
                    <span className="block text-subtle">
                      {formatM3(o.volumeM3)} · {o.units} u
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge badge={orderBadge(o, tripForOrder(o.id))} />
                  </td>
                  <td className="py-3 pl-4 pr-6">
                    <OrderRowActions order={o} onPlan={onPlan} onDetails={onDetails} onDefer={onDefer} />
                  </td>
                </tr>);

            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {orders.map((o) => {
          const outlet = getOutlet(o.outletId);
          return (
            <li key={o.id} className="rounded-card bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums text-ink">{o.id}</span>
                    <BrandTag brand={o.brand} />
                    <TempTag temperature={o.temperature} />
                    {outlet?.vanOnly && <VanOnlyTag />}
                  </div>
                  <p className="mt-1 font-medium text-ink">
                    {outlet?.name} <span className="font-normal text-subtle">· {outlet?.area}</span>
                  </p>
                </div>
                <StatusBadge badge={orderBadge(o, tripForOrder(o.id))} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-subtle">Delivery</dt>
                  <dd className="font-medium text-ink">{formatDate(o.plannedDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Window</dt>
                  <dd className="font-medium text-ink">{formatWindow(o.windowStart, o.windowEnd)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Load</dt>
                  <dd className="font-medium tabular-nums text-ink">
                    {formatKg(o.weightKg)} · {formatM3(o.volumeM3)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <OrderRowActions order={o} onPlan={onPlan} onDetails={onDetails} onDefer={onDefer} touch />
              </div>
            </li>);

        })}
      </ul>
    </>);

}