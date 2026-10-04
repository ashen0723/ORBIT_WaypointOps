import React, { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import { useOrders } from '../../contexts/OrdersContext';
import { TODAY } from '../../data/schedule';
import { Card } from '../ui/Card';

interface VolumeDay {
  iso: string;
  label: string;
  fullDate: string;
  cases: number;
  state: 'received' | 'today' | 'scheduled';
}

export function DeliveryAnalytics() {
  const { orders } = useOrders();
  const reduce = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const days = useMemo<VolumeDay[]>(() => {
    const start = addDays(parseISO(TODAY), -4);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const iso = format(date, 'yyyy-MM-dd');
      const dayOrders = orders.filter((order) => order.requestedDate === iso && order.status !== 'deferred');
      const cases = dayOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);
      return {
        iso,
        label: format(date, 'EEEEE'),
        fullDate: format(date, 'EEE, d MMM'),
        cases,
        state: iso < TODAY ? 'received' : iso === TODAY ? 'today' : 'scheduled'
      };
    });
  }, [orders]);

  const max = Math.max(1, ...days.map((day) => day.cases));
  const selected = days.find((day) => day.iso === selectedDate) ?? days[4];

  return (
    <Card className="flex h-full flex-col p-4 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Delivery Analytics</h2>
        <p className="text-sm text-subtle">Cases per day · {days[0].fullDate} – {days[days.length - 1].fullDate}</p>
      </div>

      <ul className="mt-8 flex h-56 items-stretch justify-between gap-3 sm:gap-5" aria-label="Weekly delivery volume">
        {days.map((day, index) => {
          const height = day.cases === 0 ? 0 : Math.max(30, day.cases / max * 100);
          const active = day.iso === selectedDate;
          const barClass =
          day.state === 'today' ?
          'bg-brand-mint' :
          day.state === 'scheduled' ?
          'hatch-stripes' :
          index === 2 ?
          'bg-forest' :
          'bg-brand-medium';

          return (
            <li key={day.iso} className="flex flex-1 flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedDate(day.iso)}
                aria-pressed={active}
                aria-label={`${day.fullDate}: ${day.cases} cases`}
                className="relative flex w-full max-w-[70px] flex-1 items-end rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                
                {active && day.cases > 0 &&
                <span
                  className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-ink shadow-card"
                  style={{ bottom: `calc(${height}% + 12px)` }}>
                  
                    {day.cases} cs
                  </span>
                }
                <motion.span
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.28, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
                  style={{ height: `${height}%`, transformOrigin: 'bottom' }}
                  className={`w-full rounded-full transition-colors duration-150 ${barClass} ${
                  active ? 'ring-2 ring-forest ring-offset-2 ring-offset-surface' : 'hover:opacity-80'}`
                  } />
                
              </button>
              <span aria-hidden="true" className={`text-sm ${active ? 'font-semibold text-ink' : 'text-subtle'}`}>
                {day.label}
              </span>
            </li>);

        })}
      </ul>

      <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-subtle">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-brand-medium" />
          Received
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-brand-mint" />
          Today
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-full hatch-stripes" />
          Scheduled
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        Selected {selected.fullDate}: {selected.cases} cases.
      </p>
    </Card>);

}