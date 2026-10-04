import React from 'react';
import { AlarmClockIcon, BellIcon, CircleCheckIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Outlet, Stop } from '../../types/dispatch';
import { formatDateTime } from '../../utils/clock';
import { outletLabel } from '../../utils/format';
import { to12h } from '../../utils/time';

interface DelayIssuePanelProps {
  stop: Stop;
  outlet?: Outlet;
  busy: boolean;
  onNotify: () => void;
  onDefer: () => void;
}

/** The delay stays open until the driver reaches the store; notifying only records that the store was told. */
export function DelayIssuePanel({ stop, outlet, busy, onNotify, onDefer }: DelayIssuePanelProps) {
  const delay = stop.delay;
  if (!delay) return null;
  return (
    <div role="alert" className="rounded-card bg-danger-pale p-5 md:p-6">
      <div className="flex gap-3">
        <AlarmClockIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-danger-ink" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-danger-ink">
            {delay.minutes} min late to {outletLabel(outlet)}
          </p>
          <p className="mt-0.5 text-sm text-ink">
            {delay.reason} · reported by {delay.reportedBy} {formatDateTime(delay.reportedAt)}
          </p>
          <p className="mt-1 text-sm text-ink">
            Planned {to12h(stop.plannedArrival)} → now about <span className="font-semibold">{to12h(stop.revisedArrival ?? stop.plannedArrival)}</span>
          </p>
          <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${stop.storeNotifiedAt ? 'bg-surface text-forest' : 'bg-surface text-danger-ink'}`}>
            {stop.storeNotifiedAt ? <CircleCheckIcon aria-hidden="true" className="h-3.5 w-3.5" /> : <BellIcon aria-hidden="true" className="h-3.5 w-3.5" />}
            {stop.storeNotifiedAt ? `Store told ${formatDateTime(stop.storeNotifiedAt)} — delay still open` : 'Store not told yet'}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={onNotify} disabled={busy}>
              <BellIcon aria-hidden="true" className="h-5 w-5" />
              {stop.storeNotifiedAt ? 'Send update again' : 'Notify store'}
            </Button>
            <Button size="lg" variant="secondary" onClick={onDefer}>
              Defer this stop
            </Button>
          </div>
        </div>
      </div>
    </div>);

}