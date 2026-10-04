import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/Button';
import { StatCard } from '../components/orders/StatCard';
import { OrdersTable } from '../components/orders/OrdersTable';
import { OUTLET_NAME, TODAY, WEEK_START } from '../data/schedule';
import { formatDateLong } from '../utils/format';
import { todayColombo } from '../api/storeApi';

export function Home() {
  const { orders, live, loading, error } = useOrders();
  const today = live ? todayColombo() : TODAY;
  const weekStart = live ? todayColombo(new Date(Date.now() - 7 * 86400000)) : WEEK_START;
  const current = orders.filter((o) => o.requestedDate >= today || o.status === 'delivered' || o.status === 'deferred');

  const stats = [
  {
    label: 'Orders Today',
    value: orders.filter((o) => o.requestedDate === today).length,
    tone: 'forest' as const
  },
  {
    label: 'Pending Confirmation',
    value: orders.filter((o) => o.status === 'placed').length,
    tone: 'surface' as const
  },
  {
    label: 'Deferred',
    value: orders.filter((o) => o.status === 'deferred').length,
    tone: 'surface' as const
  },
  {
    label: 'Delivered This Week',
    value: orders.filter((o) => (o.status === 'delivered' || o.status === 'receipt_confirmed') && o.requestedDate >= weekStart).length,
    tone: 'surface' as const
  }];


  return (
    <PageContainer className="pb-32 md:pb-8">
      <PageHeader
        title="My Orders"
        subtitle={`${live ? 'Your outlet' : OUTLET_NAME} · ${formatDateLong(today)}`}
        actions={
        <Link to="/place-order" className={`${buttonStyles('primary', 'lg')} hidden md:inline-flex`}>
            <PlusIcon aria-hidden="true" className="h-5 w-5" />
            Place New Order
          </Link>
        } />
      

      <section aria-label="Order summary" className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
        {stats.map((s) =>
        <StatCard key={s.label} {...s} />
        )}
      </section>
      {live && loading && <p role="status" className="mt-4 text-sm text-subtle">Loading Store orders…</p>}
      {live && error && <p role="alert" className="mt-4 text-sm text-danger-ink">{error}</p>}

      <section aria-labelledby="orders-heading" className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="orders-heading" className="text-lg font-semibold text-ink">
            Today & upcoming
          </h2>
          <Link to="/history" className="rounded text-sm font-semibold text-brand hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            Order history
          </Link>
        </div>
        <OrdersTable orders={current} label="Today's and upcoming orders" />
      </section>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface px-4 py-3 md:hidden">
        <Link to="/place-order" className={buttonStyles('primary', 'lg', true)}>
          <PlusIcon aria-hidden="true" className="h-5 w-5" />
          Place New Order
        </Link>
      </div>
    </PageContainer>);

}
