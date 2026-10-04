import React from 'react';
import type { Stop } from '../../types/dispatch';
import { hasOpenDelay } from '../../utils/status';

function segment(s: Stop): string {
  if (s.status === 'delivered') return 'bg-brand';
  if (s.status === 'failed') return 'bg-danger';
  if (s.status === 'deferred') return 'bg-amber';
  if (hasOpenDelay(s)) return 'bg-danger/60';
  if (s.status === 'arrived') return 'bg-blue';
  return 'bg-canvas ring-1 ring-inset ring-line';
}

export function StopProgress({ stops }: {stops: Stop[];}) {
  const delivered = stops.filter((s) => s.status === 'delivered').length;
  return (
    <div>
      <p className="text-sm text-ink">
        <span className="font-semibold tabular-nums">
          {delivered} / {stops.length}
        </span>{' '}
        stops delivered
      </p>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {stops.map((s) =>
        <span key={s.orderId} className={`h-2 flex-1 rounded-full ${segment(s)}`} />
        )}
      </div>
    </div>);

}