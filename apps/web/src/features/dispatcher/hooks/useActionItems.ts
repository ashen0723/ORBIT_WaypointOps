import { AlarmClockIcon, CalendarClockIcon, LucideIcon, PackageXIcon, RouteIcon, ClipboardCheckIcon } from 'lucide-react';
import { useDispatch } from '../contexts/DispatchContext';
import { REPEAT_DEFERRAL_THRESHOLD } from '../data/rules';
import { hasOpenDelay, Tone, tripLoadingState } from '../utils/status';
import { plural } from '../utils/format';
import { formatDate } from '../utils/clock';

export interface ActionItem {
  id: string;
  tone: Tone;
  icon: LucideIcon;
  title: string;
  next: string;
  cta: string;
  to: string;
}

/** Everything the dispatcher should act on, most urgent first. */
export function useActionItems(): ActionItem[] {
  const { orders, trips, events, user, draft } = useDispatch();
  if (user.role !== 'dispatcher') return [];
  const items: ActionItem[] = [];

  const delayed = trips.filter((t) => t.status === 'on_road' && t.stops.some(hasOpenDelay));
  if (delayed.length) {
    const unnotified = delayed.flatMap((t) => t.stops.filter((s) => hasOpenDelay(s) && !s.storeNotifiedAt)).length;
    items.push({
      id: 'delayed',
      tone: 'problem',
      icon: AlarmClockIcon,
      title: `${plural(delayed.length, 'trip')} running late`,
      next: unnotified ? `${plural(unnotified, 'store')} not told yet. Notify them or defer the stop.` : 'Stores have been told. Watch for arrival.',
      cta: 'View Delivery',
      to: delayed.length === 1 ? `/monitoring/${delayed[0].id}` : '/monitoring'
    });
  }

  const exceptions = trips.filter((t) => t.status === 'loading' && t.load.some((l) => l.loadedUnits !== null && (l.loadedUnits < l.expectedUnits || l.damagedUnits > 0)));
  if (exceptions.length) {
    items.push({
      id: 'loading',
      tone: tripLoadingState(exceptions[0]) === 'exception' ? 'problem' : 'attention',
      icon: PackageXIcon,
      title: `${plural(exceptions.length, 'trip')} with loading exceptions`,
      next: 'Missing or damaged units were recorded at the depot. Review before the trip leaves.',
      cta: 'Review Loading',
      to: exceptions.length === 1 ? `/loading/${exceptions[0].id}` : '/loading'
    });
  }

  const repeat = orders.filter((o) => o.status === 'pending' && o.deferralCount >= REPEAT_DEFERRAL_THRESHOLD);
  if (repeat.length) {
    items.push({ id: 'repeat', tone: 'attention', icon: CalendarClockIcon, title: `${plural(repeat.length, 'order')} deferred ${REPEAT_DEFERRAL_THRESHOLD}+ times`, next: 'These are planned first. Allocate them before new orders.', cta: 'View Deferrals', to: '/deferrals' });
  }

  const date = draft.date;
  const waiting = orders.filter((o) => o.status === 'pending' && o.plannedDate === date);
  if (waiting.length) {
    items.push({ id: 'plan', tone: 'waiting', icon: RouteIcon, title: `${plural(waiting.length, 'order')} waiting for ${formatDate(date)}`, next: 'Group orders into a trip and choose a vehicle.', cta: 'Plan Trips', to: '/planning' });
  }

  const receiptIssues = events.filter((e) => e.type === 'receipt_confirmed' && /missing|damaged/.test(e.message)).slice(0, 5);
  if (receiptIssues.length) {
    items.push({ id: 'receipts', tone: 'neutral', icon: ClipboardCheckIcon, title: `${plural(receiptIssues.length, 'store receipt')} reported shortages`, next: receiptIssues[0].message, cta: 'View History', to: '/history' });
  }

  return items;
}