import React from 'react';
import { Link } from 'react-router-dom';
import { CarrotIcon, PlusIcon, ShirtIcon, TvIcon } from 'lucide-react';
import type { Brand } from '../../types/orders';
import { Card } from '../ui/Card';
import { buttonStyles } from '../ui/Button';
import { useOrders } from '../../contexts/OrdersContext';
import { STATUS_CONFIG } from '../../utils/status';
import { formatDate } from '../../utils/format';

const BRAND_ICON: Record<Brand, {Icon: typeof CarrotIcon;color: string;}> = {
  Fresh: { Icon: CarrotIcon, color: 'text-forest' },
  Style: { Icon: ShirtIcon, color: 'text-brand' },
  Tech: { Icon: TvIcon, color: 'text-brand-medium' }
};

export function UpcomingOrdersList() {
  const { orders } = useOrders();
  const list = orders.
  filter((o) => o.status !== 'receipt_confirmed').
  sort((a, b) => a.requestedDate.localeCompare(b.requestedDate)).
  slice(0, 5);

  return (
    <Card className="flex h-full flex-col p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Orders</h2>
        <Link to="/place-order" className={buttonStyles('outline', 'sm')}>
          <PlusIcon aria-hidden="true" className="h-4 w-4" />
          New
        </Link>
      </div>
      <ul className="mt-4 space-y-1">
        {list.map((o) => {
          const { Icon, color } = BRAND_ICON[o.brand];
          return (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                
                <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tabular-nums text-ink">{o.id}</span>
                  <span className={`block text-xs ${o.status === 'deferred' ? 'font-medium text-amber-ink' : 'text-subtle'}`}>
                    {o.brand} · {STATUS_CONFIG[o.status].label} · {formatDate(o.deferral?.newDate ?? o.requestedDate)}
                  </span>
                </span>
              </Link>
            </li>);

        })}
      </ul>
    </Card>);

}