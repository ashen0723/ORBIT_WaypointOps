import { useDispatch } from '../contexts/DispatchContext';
import { REPEAT_DEFERRAL_THRESHOLD } from '../data/rules';
import { hasOpenDelay, tripLoadingState } from '../utils/status';

export interface NavCount {
  value: number;
  tone: 'danger' | 'neutral';
  srLabel: string;
}

export function useNavCounts(): Record<string, NavCount | undefined> {
  const { orders, trips, user } = useDispatch();
  if (user.role === 'store_manager') {
    const toConfirm = orders.filter((o) => (o.status === 'delivered' || o.status === 'partially_delivered') && !o.receipt).length;
    return { '/store': toConfirm ? { value: toConfirm, tone: 'danger', srLabel: 'deliveries to confirm' } : undefined };
  }
  if (user.role === 'driver') {
    const active = trips.filter((t) => t.status === 'on_road').length;
    return { '/driver': active ? { value: active, tone: 'neutral', srLabel: 'active trips' } : undefined };
  }
  const loading = trips.filter((t) => t.status === 'loading');
  const exceptions = loading.filter((t) => tripLoadingState(t) === 'exception').length;
  if (user.role === 'loader') return { '/loading': loading.length ? { value: loading.length, tone: exceptions ? 'danger' : 'neutral', srLabel: 'trips to load' } : undefined };

  const waiting = orders.filter((o) => o.status === 'pending').length;
  const delayed = trips.filter((t) => t.status === 'on_road' && t.stops.some(hasOpenDelay)).length;
  const repeat = orders.filter((o) => o.status === 'pending' && o.deferralCount >= REPEAT_DEFERRAL_THRESHOLD).length;
  return {
    '/orders': waiting ? { value: waiting, tone: 'neutral', srLabel: 'orders waiting' } : undefined,
    '/loading': exceptions ? { value: exceptions, tone: 'danger', srLabel: 'loading exceptions' } : undefined,
    '/monitoring': delayed ? { value: delayed, tone: 'danger', srLabel: 'delayed trips' } : undefined,
    '/deferrals': repeat ? { value: repeat, tone: 'danger', srLabel: 'repeatedly deferred orders' } : undefined
  };
}