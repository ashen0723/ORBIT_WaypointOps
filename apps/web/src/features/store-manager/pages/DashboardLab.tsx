import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/orders/StatCard';
import { DeliveryAnalytics } from '../components/dashboard/DeliveryAnalytics';
import { CutoffReminder } from '../components/dashboard/CutoffReminder';
import { UpcomingOrdersList } from '../components/dashboard/UpcomingOrdersList';
import { DeliveryProgress } from '../components/dashboard/DeliveryProgress';
import { CutoffBanner } from '../components/orders/CutoffBanner';
import { useCutoffSeconds } from '../contexts/CutoffContext';
import { WEEK_START } from '../data/schedule';
import { todayColombo } from '../api/storeApi';

export function DashboardLab() {
  const { orders, live, loading, error } = useOrders();
  const cutoffSeconds = useCutoffSeconds();
  const today = live ? todayColombo() : null;
  const monday = today ? new Date(`${today}T00:00:00Z`) : null;
  if (monday) monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const weekStart = monday ? monday.toISOString().slice(0, 10) : WEEK_START;
  const week = orders.filter((o) => o.requestedDate >= weekStart && (!today || o.requestedDate <= today));
  const delivered = week.filter((o) => o.status === 'delivered' || o.status === 'receipt_confirmed').length;
  const inProgress = week.filter((o) => ['confirmed', 'planned', 'loading', 'in_transit'].includes(o.status)).length;
  const deferred = orders.filter((o) => o.status === 'deferred').length;

  return (
    <PageContainer>
      <PageHeader title="Dashboard" subtitle="Plan, order, and receive deliveries with ease." />
      {live && loading && <p role="status" className="mt-4 text-sm text-subtle">Loading Store orders…</p>}
      {live && error && <p role="alert" className="mt-4 text-sm text-danger-ink">{error}</p>}

      <section aria-label="This week at a glance" className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <StatCard label="Total Orders" value={week.length} highlight />
        <StatCard label="Delivered" value={delivered} />
        <StatCard label="In Progress" value={inProgress} />
        <StatCard label="Deferred" value={deferred} />
      </section>

      <CutoffBanner seconds={cutoffSeconds} />

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        <div className="md:col-span-2 lg:col-span-6">
          <DeliveryAnalytics />
        </div>
        <div className="lg:col-span-6">
          <UpcomingOrdersList />
        </div>
        <div className="md:col-span-2 lg:col-span-5">
          <DeliveryProgress />
        </div>
        <div className="lg:col-span-7">
          <CutoffReminder />
        </div>
      </div>
    </PageContainer>);

}
