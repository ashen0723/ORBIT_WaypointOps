import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { useDispatch } from '../../contexts/DispatchContext';
import { formatDate, formatDateTime } from '../../utils/clock';

export function StoreHistory() {
  const { orders, events } = useDispatch();
  const received = orders.filter((o) => o.receipt);

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader title="Order History" subtitle="Confirmed receipts and recent activity for your store." />
      <h2 className="mt-6 text-lg font-semibold text-ink">Receipts</h2>
      {received.length === 0 ?
      <Card className="mt-3 p-8 text-center text-subtle">No receipts confirmed yet.</Card> :

      <Card className="mt-3">
          <ul className="divide-y divide-line">
            {received.map((o) =>
          <li key={o.id} className="px-5 py-3 text-sm">
                <Link to={`/store/orders/${o.id}`} className="font-semibold text-ink hover:text-brand">
                  {o.id}
                </Link>{' '}
                <span className="text-subtle">
                  · {formatDate(o.plannedDate)} · {o.receipt?.receivedUnits} received · {o.receipt?.damagedUnits} damaged · {o.receipt?.missingUnits} missing
                </span>
              </li>
          )}
          </ul>
        </Card>
      }
      <h2 className="mt-8 text-lg font-semibold text-ink">Activity</h2>
      <Card className="mt-3">
        <ol className="divide-y divide-line">
          {events.slice(0, 50).map((e) =>
          <li key={e.id} className="px-5 py-3">
              <p className="text-sm text-ink">{e.message}</p>
              <p className="text-xs text-subtle">{formatDateTime(e.at)}</p>
            </li>
          )}
          {events.length === 0 && <li className="px-5 py-6 text-center text-sm text-subtle">No activity yet.</li>}
        </ol>
      </Card>
    </PageContainer>);

}