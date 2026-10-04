import React from 'react';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import type { Order } from '../../types/orders';
import { TIMELINE_STEPS } from '../../utils/orders';
export function StatusTimeline({
  order


}: {order: Order;}) {
  const deferred = order.status === 'deferred';
  const currentIndex = deferred ? 1 : TIMELINE_STEPS.findIndex((s) => s.key === order.status);
  const allDone = order.status === 'receipt_confirmed';
  return <ol className="flex flex-col md:flex-row">
      {TIMELINE_STEPS.map((step, i) => {
      const done = i < currentIndex || allDone && i === currentIndex;
      const current = i === currentIndex && !allDone;
      const deferredHere = deferred && i === currentIndex + 1;
      const last = i === TIMELINE_STEPS.length - 1;
      const time = order.events?.[step.key];
      let dot = 'border-2 border-line bg-surface text-transparent';
      if (done) dot = 'bg-brand text-white';
      if (current) dot = 'border-2 border-brand bg-surface';
      if (deferredHere) dot = 'bg-amber text-ink';
      return <li key={step.key} aria-current={current ? 'step' : undefined} className="relative flex gap-4 pb-6 last:pb-0 md:flex-1 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center">
            {!last && <span aria-hidden="true" className={`absolute left-[11px] top-7 h-[calc(100%-28px)] w-0.5 md:hidden ${i < currentIndex ? 'bg-brand' : 'bg-line'}`} />}
            {i > 0 && <span aria-hidden="true" className={`absolute top-[11px] hidden h-0.5 md:block ${i <= currentIndex ? 'bg-brand' : 'bg-line'}`} style={{
          left: 'calc(-50% + 16px)',
          right: 'calc(50% + 16px)'
        }} />}
            <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ${dot}`}>
              {done && <CheckIcon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />}
              {current && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-brand" />}
              {deferredHere && <TriangleAlertIcon aria-hidden="true" className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 md:px-1">
              <p className={`text-sm leading-tight md:text-xs ${current || deferredHere ? 'font-semibold text-ink' : done ? 'font-medium text-ink' : 'text-subtle'}`}>
                {deferredHere ? 'Deferred' : step.label}
                <span className="sr-only">{done ? ' — completed' : current ? ' — current step' : ''}</span>
              </p>
              {deferredHere && <p className="mt-0.5 text-xs text-amber-ink">Awaiting next run</p>}
              {!deferredHere && time && <p className="mt-0.5 text-xs text-subtle">{time}</p>}
            </div>
          </li>;
    })}
    </ol>;
}