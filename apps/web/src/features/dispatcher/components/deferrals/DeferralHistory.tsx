import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../dispatch/StatusBadge';
import { deferralHistory } from '../../data/deferralHistory';
import type { DeferralOutcome } from '../../types/dispatch';
import type { Badge } from '../../utils/status';

const OUTCOME_BADGE: Record<DeferralOutcome, Badge> = {
  Rescheduled: { label: 'Rescheduled', tone: 'info' },
  Delivered: { label: 'Delivered', tone: 'success' },
  'Deferred again': { label: 'Deferred again', tone: 'attention' }
};

const COLUMNS = ['Order ID', 'Original Delivery', 'Deferral Reason', 'Deferred On', 'New Planned Date', 'Status'];

export function DeferralHistory() {
  return (
    <Card className="mt-8">
      <div className="border-b border-line px-4 py-4 md:px-6">
        <h2 className="text-lg font-semibold text-ink">History</h2>
        <p className="text-sm text-subtle">Why each order was deferred, and what happened next.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {COLUMNS.map((c) =>
              <th key={c} scope="col" className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-subtle md:first:pl-6 md:last:pr-6">
                  {c}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deferralHistory.map((h) =>
            <tr key={`${h.orderId}-${h.deferredDate}`}>
                <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-ink md:pl-6">{h.orderId}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink">{h.originalDate}</td>
                <td className="px-4 py-3 text-ink">{h.reason}</td>
                <td className="whitespace-nowrap px-4 py-3 text-subtle">{h.deferredDate}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{h.newDate}</td>
                <td className="whitespace-nowrap px-4 py-3 md:pr-6">
                  <StatusBadge badge={OUTCOME_BADGE[h.status]} size="sm" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>);

}