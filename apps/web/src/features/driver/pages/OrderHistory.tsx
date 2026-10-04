import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusIcon, XIcon } from 'lucide-react';
import type { Brand, OrderStatus } from '../types/orders';
import { useOrders } from '../contexts/OrdersContext';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/Button';
import { OrdersTable } from '../components/orders/OrdersTable';
import { OUTLET_NAME } from '../data/schedule';
import { STATUS_CONFIG } from '../utils/status';

const selectClass =
'h-10 w-full rounded-full border border-line bg-surface px-4 text-base font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:w-48 lg:text-sm';

export function OrderHistory() {
  const { orders } = useOrders();
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
        subtitle={`All orders for ${OUTLET_NAME} · ${filtered.length} shown`}
        actions={
        <Link to="/place-order" className={`${buttonStyles('primary', 'lg')} w-full md:w-auto`}>
            <PlusIcon aria-hidden="true" className="h-5 w-5" />
            Place New Order
          </Link>
        } />
      
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="block">
          <span className="text-sm text-subtle">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | OrderStatus)} className={`${selectClass} mt-1`}>
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) =>
            <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            )}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-subtle">Brand</span>
          <select value={brand} onChange={(e) => setBrand(e.target.value as 'all' | Brand)} className={`${selectClass} mt-1`}>
            <option value="all">All brands</option>
            <option value="Fresh">Fresh</option>
            <option value="Style">Style</option>
            <option value="Tech">Tech</option>
          </select>
        </label>
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