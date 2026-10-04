import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CircleCheckIcon, ClockIcon } from 'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { FilterSelect } from '../components/ui/FilterSelect';
import { WorkflowBar } from '../components/workflow/WorkflowBar';
import { OrdersTable } from '../components/orders/OrdersTable';
import { OrderDetailDrawer } from '../components/orders/OrderDetailDrawer';
import { DeferOrderModal } from '../components/orders/DeferOrderModal';
import { IncompatibleOrderModal } from '../components/planning/IncompatibleOrderModal';
import { useDispatch } from '../contexts/DispatchContext';
import { ORDER_CUTOFF } from '../data/rules';
import type { Brand, DepotId, Order, OrderStatus, Temperature } from '../types/dispatch';
import { earliestDeliveryDate } from '../utils/calendar';
import { formatDate } from '../utils/clock';
import { comparePriority } from '../utils/priority';
import { to12h } from '../utils/time';

const STATUS_RANK: Record<OrderStatus, number> = { pending: 0, allocated: 1, in_transit: 2, partially_delivered: 3, delivered: 4 };

export function Orders() {
  const { orders, draft, getOrder, startTripWith, calendar, serverTime } = useDispatch();
  const navigate = useNavigate();
  const [blockedIds, setBlockedIds] = useState<string[] | null>(null);
  const [brand, setBrand] = useState<'all' | Brand>('all');
  const [temp, setTemp] = useState<'all' | Temperature>('all');
  const [depot, setDepot] = useState<'all' | DepotId>('all');
  const [status, setStatus] = useState<'all' | OrderStatus>('pending');
  const [date, setDate] = useState<string>('all');
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [deferId, setDeferId] = useState<string | null>(null);

  const draftOrders = draft.orderIds.map(getOrder).filter((o): o is Order => Boolean(o));
  const dates = Array.from(new Set(orders.map((o) => o.plannedDate))).sort();
  const pending = orders.filter((o) => o.status === 'pending');
  const nextDate = earliestDeliveryDate(calendar, 'DEP-PLG', serverTime);

  const list = useMemo(
    () =>
    orders.
    filter((o) => brand === 'all' || o.brand === brand).
    filter((o) => temp === 'all' || o.temperature === temp).
    filter((o) => depot === 'all' || o.depotId === depot).
    filter((o) => status === 'all' || o.status === status).
    filter((o) => date === 'all' || o.plannedDate === date).
    sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.plannedDate.localeCompare(b.plannedDate) || comparePriority(a, b)),
    [orders, brand, temp, depot, status, date]
  );

  const plan = (order: Order) => {
    const blocked = startTripWith(order.id);
    if (blocked.length) {
      setDetailsId(null);
      setBlockedIds(blocked);
      return;
    }
    toast.success(`${order.id} added to the draft trip`, { description: `Planning ${formatDate(order.plannedDate)}. Add more orders or choose a vehicle.` });
    navigate('/planning');
  };

  const openDefer = (id: string) => {
    setDetailsId(null);
    setDeferId(id);
  };

  return (
    <PageContainer className="max-w-[1400px]">
      <PageHeader title="Orders" subtitle="Every store order, by planned delivery date" />
      <WorkflowBar active={['orders']} className="mt-4" />

      <Card className="mt-6 flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        {pending.length > 0 ?
        <>
            <p className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold leading-none tabular-nums text-ink">{pending.length}</span>
              <span className="text-lg font-semibold text-ink">orders waiting for a trip</span>
            </p>
            <p className="text-sm text-subtle">
              Across {new Set(pending.map((o) => o.plannedDate)).size} dates. Click <span className="font-semibold text-ink">Plan Trip</span> to start.
            </p>
          </> :

        <p className="flex items-center gap-2 font-semibold text-forest">
            <CircleCheckIcon aria-hidden="true" className="h-5 w-5" />
            Every order has a trip.
          </p>
        }
      </Card>

      <div className="mt-6 flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3 shadow-card sm:flex-row sm:items-center sm:gap-3">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <ClockIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-forest" />
          Cutoff {to12h(ORDER_CUTOFF)} Colombo
        </p>
        <p className="text-sm text-subtle">New orders placed now are eligible from {formatDate(nextDate, 'long')}.</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <FilterSelect label="Date" value={date} onChange={setDate} options={[{ value: 'all', label: 'Any date' }, ...dates.map((d) => ({ value: d, label: formatDate(d) }))]} />
        <FilterSelect label="Brand" value={brand} onChange={setBrand} options={[{ value: 'all', label: 'All brands' }, { value: 'Fresh', label: 'Fresh' }, { value: 'Style', label: 'Style' }, { value: 'Tech', label: 'Tech' }]} />
        <FilterSelect label="Storage" value={temp} onChange={setTemp} options={[{ value: 'all', label: 'Any storage' }, { value: 'ambient', label: 'Ambient' }, { value: 'chilled', label: 'Chilled' }, { value: 'frozen', label: 'Frozen' }]} />
        <FilterSelect label="Depot" value={depot} onChange={setDepot} options={[{ value: 'all', label: 'All depots' }, { value: 'DEP-PLG', label: 'Peliyagoda' }, { value: 'DEP-KDY', label: 'Kandy' }]} />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
          { value: 'all', label: 'Any status' },
          { value: 'pending', label: 'Awaiting trip' },
          { value: 'allocated', label: 'Allocated' },
          { value: 'in_transit', label: 'On the way' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'partially_delivered', label: 'Part delivered' }]
          } />
        
      </div>

      <p className="mb-3 mt-4 text-sm text-subtle" aria-live="polite">
        Showing <span className="font-semibold text-ink">{list.length}</span> of {orders.length}
      </p>

      {list.length === 0 ? <Card className="p-10 text-center text-subtle">No orders match these filters.</Card> : <OrdersTable orders={list} onPlan={plan} onDetails={setDetailsId} onDefer={openDefer} />}

      <OrderDetailDrawer orderId={detailsId} onClose={() => setDetailsId(null)} onPlan={plan} onDefer={openDefer} />
      <DeferOrderModal orderId={deferId} onClose={() => setDeferId(null)} />
      <IncompatibleOrderModal orderIds={blockedIds} tripOrders={draftOrders} onClose={() => setBlockedIds(null)} />
    </PageContainer>);

}