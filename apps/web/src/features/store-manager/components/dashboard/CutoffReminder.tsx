import { Link } from 'react-router-dom';
import { PackagePlusIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { buttonStyles } from '../ui/Button';
import { useCutoffSeconds } from '../../contexts/CutoffContext';
import { reminders, type ReminderPriority } from '../../data/reminders';
import { splitCountdown } from '../../utils/time';
import { useOrders } from '../../contexts/OrdersContext';

const PRIORITY_STYLES: Record<ReminderPriority, {label: string;chip: string;dot: string;}> = {
  high: { label: 'High', chip: 'bg-danger-pale text-danger-ink', dot: 'bg-danger' },
  medium: { label: 'Medium', chip: 'bg-amber-pale text-amber-ink', dot: 'bg-amber' },
  low: { label: 'Low', chip: 'bg-brand-pale text-forest', dot: 'bg-brand-mint' }
};

export function CutoffReminder() {
  const { live, store } = useOrders();
  const seconds = useCutoffSeconds();
  const { h, m } = splitCountdown(seconds);
  const past = seconds === 0;
  const visibleReminders = live ? store?.nextDeliveryDate ? [{
    id: 'next-delivery',
    title: `${store.brand.charAt(0)}${store.brand.slice(1).toLowerCase()} order for ${new Date(`${store.nextDeliveryDate}T00:00:00Z`).toLocaleDateString('en-LK', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}`,
    deadline: store.cutoffAt ? new Date(store.cutoffAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'Next order cutoff',
    priority: 'high' as const,
    usesTodayCutoff: Boolean(store.cutoffAt)
  }] : [] : reminders;

  return (
    <Card className="flex h-full flex-col p-4 md:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Reminders</h2>
        <span className="text-sm text-subtle">{visibleReminders.length} due</span>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {visibleReminders.map((r) => {
          const p = PRIORITY_STYLES[r.priority];
          const closed = r.usesTodayCutoff && past;
          const urgent = r.usesTodayCutoff && !past && seconds < 3600;
          const deadlineText = r.usesTodayCutoff ?
          past ?
          'Cutoff passed' :
          `${r.deadline} · ${h}h ${m}m left` :
          `Cutoff ${r.deadline}`;

          return (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.chip}`}>
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                    {p.label}
                    <span className="sr-only"> priority</span>
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-ink">{r.title}</p>
                <p
                  className={`text-xs ${
                  closed ? 'font-medium text-danger-ink' : urgent ? 'font-medium text-amber-ink' : 'text-subtle'}`
                  }>
                  
                  {deadlineText}
                </p>
              </div>
              {closed ?
              <span className="shrink-0 text-xs font-medium text-muted">Closed</span> :

              <Link
                to="/place-order"
                aria-label={`Place order: ${r.title}`}
                className={`${buttonStyles(r.priority === 'high' ? 'primary' : 'secondary', 'sm')} shrink-0`}>
                
                  <PackagePlusIcon aria-hidden="true" className="h-4 w-4" />
                  Order
                </Link>
              }
            </li>);

        })}
      </ul>
    </Card>);

}
