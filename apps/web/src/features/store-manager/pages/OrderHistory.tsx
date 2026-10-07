import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { XIcon } from 'lucide-react';
import type { Brand, OrderStatus } from '../types/orders';
import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { OrdersTable } from '../components/orders/OrdersTable';
import { OUTLET_NAME } from '../data/schedule';
import { STATUS_CONFIG } from '../utils/status';
import { GreenSelect } from '../components/ui/GreenSelect';

const selectClass = 'mt-1 h-10 w-full rounded-full sm:w-48';

export function OrderHistory() {
  const { orders, store, live, loading, error } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [brand, setBrand] = useState<'all' | Brand>('all');

  const q = query.toLowerCase();
  const filtered = orders.filter(
    (o) =>
    (status === 'all' || o.status === status) && (
    brand === 'all' || o.brand === brand) && (
    !q || o.id.toLowerCase().includes(q) || o.items.some((i) => i.name.toLowerCase().includes(q)))
  );

  return (
    <PageContainer>
      <PageHeader
        title="Order History"
        subtitle={`All orders for ${live ? (store?.outletName ?? 'your outlet') : OUTLET_NAME} · ${filtered.length} shown`} />
      {live && loading && <p role="status" className="mt-4 text-sm text-subtle">Loading order history…</p>}
      {live && error && <p role="alert" className="mt-4 text-sm text-danger-ink">{error}</p>}
      
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="block">
          <span className="text-sm text-subtle">Status</span>
          <GreenSelect<'all' | OrderStatus> label="Status" value={status} onChange={setStatus} className={selectClass}
            options={[{ value: 'all', label: 'All statuses' }, ...(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => ({ value: s, label: STATUS_CONFIG[s].label }))]} />
        </div>
        <div className="block">
          <span className="text-sm text-subtle">Brand</span>
          <GreenSelect<'all' | Brand> label="Brand" value={brand} onChange={setBrand} className={selectClass}
            options={[{ value: 'all', label: 'All brands' }, { value: 'Fresh', label: 'Fresh' }, { value: 'Style', label: 'Style' }, { value: 'Tech', label: 'Tech' }]} />
        </div>
        {query &&
        <span className="inline-flex h-10 items-center gap-2 self-start rounded-full bg-brand-pale pl-4 pr-1 text-sm text-forest sm:self-auto">
            Results for “{query}”
            <button
            type="button"
            onClick={() => setSearchParams({})}
            aria-label="Clear search"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            
              <XIcon className="h-4 w-4" />
            </button>
          </span>
        }
      </div>
      <div className="mt-6">
        <OrdersTable orders={filtered} label="Order history" defaultSort={{ key: 'requestedDate', dir: 'desc' }} />
      </div>
    </PageContainer>);

}
