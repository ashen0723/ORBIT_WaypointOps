import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, ChevronsUpDownIcon } from 'lucide-react';
import type { Order } from '../../types/orders';
import { Card } from '../ui/Card';
import { StatusChip } from './StatusChip';
import { BrandTag } from './BrandTag';
import { ChilledTag } from './ChilledTag';
import { formatDate } from '../../utils/format';
import { arrivalLabel, arrivalSortValue, orderAction, statusRank } from '../../utils/orders';
import { GreenSelect } from '../ui/GreenSelect';

type SortKey = 'id' | 'brand' | 'requestedDate' | 'status' | 'arrival';
type SortDir = 'asc' | 'desc';

interface OrdersTableProps {
  orders: Order[];
  label: string;
  defaultSort?: {key: SortKey;dir: SortDir;};
}

const COLUMNS: {key: SortKey;label: string;}[] = [
{ key: 'id', label: 'Order ID' },
{ key: 'brand', label: 'Brand' },
{ key: 'requestedDate', label: 'Requested date' },
{ key: 'status', label: 'Status' },
{ key: 'arrival', label: 'Expected arrival' }];


export function OrdersTable({ orders, label, defaultSort = { key: 'requestedDate', dir: 'asc' } }: OrdersTableProps) {
  const navigate = useNavigate();
  const [sort, setSort] = useState(defaultSort);

  const sorted = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      const r = compare(a, b, sort.key);
      return sort.dir === 'asc' ? r : -r;
    });
    return list;
  }, [orders, sort]);

  const toggle = (key: SortKey) =>
  setSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  if (orders.length === 0) {
    return <Card className="p-8 text-center text-subtle">No orders match this view.</Card>;
  }

  return (
    <>
      <Card className="hidden overflow-hidden lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{label}</caption>
          <thead className="border-b border-line bg-canvas/50">
            <tr>
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                const SortIcon = !active ? ChevronsUpDownIcon : sort.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? sort.dir === 'asc' ? 'ascending' : 'descending' : 'none'}
                    className="px-6 py-3">
                    
                    <button
                      type="button"
                      onClick={() => toggle(col.key)}
                      className={`-mx-1 inline-flex items-center gap-1 whitespace-nowrap rounded px-1 text-xs font-semibold transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      active ? 'text-ink' : 'text-subtle'}`
                      }>
                      
                      {col.label}
                      <SortIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </th>);

              })}
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Next step</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((order) => {
              const action = orderAction(order);
              return (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-canvas/60">
                  
                  <td className="px-6 py-3.5">
                    <Link
                      to={`/orders/${order.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded font-semibold tabular-nums text-ink hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      
                      {order.id}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <BrandTag brand={order.brand} />
                      {order.type === 'chilled' && <ChilledTag />}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-ink">{formatDate(order.requestedDate)}</td>
                  <td className="px-6 py-3.5">
                    <StatusChip status={order.status} />
                  </td>
                  <td className={`whitespace-nowrap px-6 py-3.5 ${order.status === 'deferred' ? 'font-medium text-amber-ink' : 'text-ink'}`}>
                    {arrivalLabel(order)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {action ?
                    <Link
                      to={action.to}
                      onClick={(e) => e.stopPropagation()}
                      className="whitespace-nowrap rounded text-sm font-semibold text-brand hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      
                        {action.label}
                      </Link> :

                    <ChevronRightIcon aria-hidden="true" className="ml-auto h-4 w-4 text-muted" />
                    }
                  </td>
                </tr>);

            })}
          </tbody>
        </table>
      </Card>

      <div className="lg:hidden">
        <div className="mb-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-subtle">Sort by</span>
          <GreenSelect label="Sort by" value={`${sort.key}:${sort.dir}`}
            onChange={(value) => {
              const [key, dir] = value.split(':');
              setSort({ key: key as SortKey, dir: dir as SortDir });
            }}
            className="h-10 min-w-40 rounded-xl"
            options={COLUMNS.flatMap(col => [
              { value: `${col.key}:asc`, label: `${col.label} ↑` },
              { value: `${col.key}:desc`, label: `${col.label} ↓` }
            ])} />
        </div>
        <ul className="grid gap-4 md:grid-cols-2" aria-label={label}>
          {sorted.map((order) => {
            const action = orderAction(order);
            return (
              <li key={order.id} className="relative min-w-0 flex flex-col rounded-card bg-surface p-4 shadow-card">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="rounded text-base font-semibold tabular-nums text-ink after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand">
                    
                    {order.id}
                  </Link>
                  <StatusChip status={order.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <BrandTag brand={order.brand} />
                  {order.type === 'chilled' && <ChilledTag />}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-subtle">Requested date</dt>
                    <dd className="mt-0.5 font-medium text-ink">{formatDate(order.requestedDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-subtle">Expected arrival</dt>
                    <dd className={`mt-0.5 font-medium ${order.status === 'deferred' ? 'text-amber-ink' : 'text-ink'}`}>
                      {arrivalLabel(order)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto pt-4">
                  {action ?
                  <Link
                    to={action.to}
                    className="relative z-10 inline-flex items-center gap-1 rounded text-sm font-semibold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    
                      {action.label}
                      <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
                    </Link> :

                  <span className="inline-flex items-center gap-1 text-sm text-subtle">
                      View details
                      <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
                    </span>
                  }
                </div>
              </li>);

          })}
        </ul>
      </div>
    </>);

}

function compare(a: Order, b: Order, key: SortKey): number {
  switch (key) {
    case 'id':
      return a.id.localeCompare(b.id);
    case 'brand':
      return a.brand.localeCompare(b.brand) || a.type.localeCompare(b.type);
    case 'status':
      return statusRank(a.status) - statusRank(b.status);
    case 'arrival':
      return arrivalSortValue(a) - arrivalSortValue(b);
    default:
      return a.requestedDate.localeCompare(b.requestedDate) || a.id.localeCompare(b.id);
  }
}
