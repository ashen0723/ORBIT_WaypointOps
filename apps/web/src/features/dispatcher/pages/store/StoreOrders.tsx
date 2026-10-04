import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { buttonStyles } from '../../components/ui/Button';
import { StatusBadge } from '../../components/dispatch/StatusBadge';
import { BrandTag, TempTag } from '../../components/dispatch/BrandTag';
import { useDispatch } from '../../contexts/DispatchContext';
import { formatDate } from '../../utils/clock';
import { hasOpenDelay, orderBadge, stopEta } from '../../utils/status';
import { to12h } from '../../utils/time';

export function StoreOrders() {
  const { orders, tripForOrder, user, getOutlet } = useDispatch();
  const active = orders.filter((o) => !o.receipt).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="My Orders"
        subtitle={getOutlet(user.outletId ?? '')?.name}
        actions={
        <Link to="/store/new" className={buttonStyles('primary', 'md')}>
            New Order
          </Link>
        } />
      
      {active.length === 0 ?
      <Card className="mt-6 p-10 text-center text-subtle">No open orders. Place one to get started.</Card> :

      <ul className="mt-6 space-y-3">
          {active.map((o) => {
          const trip = tripForOrder(o.id);
          const stop = trip?.stops.find((s) => s.orderId === o.id);
          return (
            <li key={o.id}>
                <Link to={`/store/orders/${o.id}`} className="block rounded-card bg-surface p-4 shadow-card hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums text-ink">{o.id}</span>
                      <BrandTag brand={o.brand} />
                      <TempTag temperature={o.temperature} />
                    </span>
                    <StatusBadge badge={orderBadge(o, trip)} />
                  </div>
                  <p className="mt-1 text-sm text-subtle">
                    Delivery {formatDate(o.plannedDate)}
                    {o.plannedDate !== o.requestedDate && ` (requested ${formatDate(o.requestedDate)})`} · {o.units} units
                    {stop && ` · ETA ${to12h(stopEta(stop))}`}
                    {stop && hasOpenDelay(stop) && ` · delayed: ${stop.delay?.reason}`}
                  </p>
                </Link>
              </li>);

        })}
        </ul>
      }
    </PageContainer>);

}