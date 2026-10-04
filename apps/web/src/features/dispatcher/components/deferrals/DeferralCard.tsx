import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { BrandTag } from '../dispatch/BrandTag';
import { StatusBadge } from '../dispatch/StatusBadge';
import { deferralReasons } from '../../data/deferrals';
import type { Deferral, Order } from '../../types/dispatch';

interface DeferralCardProps {
  deferral: Deferral;
  order: Order;
  onReschedule: () => void;
  onReturn: () => void;
}

export function DeferralCard({ deferral, order, onReschedule, onReturn }: DeferralCardProps) {
  const reason = deferralReasons.find((r) => r.value === deferral.reason)?.label ?? 'Other';

  return (
    <article className="flex h-full flex-col rounded-card bg-surface p-5 shadow-card md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold tabular-nums text-ink">{order.id}</span>
            <BrandTag brand={order.brand} />
          </p>
          <p className="mt-0.5 text-sm text-subtle">
            {order.store} · {order.district}
          </p>
        </div>
        <StatusBadge badge={{ label: 'Deferred', tone: 'attention' }} />
      </div>

      <div className="mt-4 rounded-2xl bg-amber-pale px-4 py-3">
        <p className="text-xs font-semibold text-amber-ink">Reason</p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{deferral.note ?? reason}</p>
        {deferral.note && <p className="text-xs text-amber-ink">{reason}</p>}
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-ink">
        <CalendarIcon aria-hidden="true" className="h-4 w-4 text-subtle" />
        Next planned date: <span className="font-semibold">{deferral.nextDate}</span>
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
        <Button onClick={onReschedule} className="sm:flex-1">
          Reschedule
        </Button>
        <Button variant="secondary" onClick={onReturn} className="sm:flex-1">
          Return to Planning
        </Button>
      </div>
    </article>);

}