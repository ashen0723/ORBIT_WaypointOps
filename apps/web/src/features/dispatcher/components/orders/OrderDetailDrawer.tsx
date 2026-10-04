import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { BrandTag, TempTag, VanOnlyTag } from '../dispatch/BrandTag';
import { StatusBadge } from '../dispatch/StatusBadge';
import { DeferralHistory } from '../deferrals/DeferralHistory';
import { useDispatch } from '../../contexts/DispatchContext';
import type { Order } from '../../types/dispatch';
import { DOCK_LABEL } from '../../data/rules';
import { formatDate, formatDateTime } from '../../utils/clock';
import { formatKg, formatM3, formatWindow, outletLabel, tripLabel } from '../../utils/format';
import { orderBadge, stopEta } from '../../utils/status';
import { requirementText } from '../../utils/vehicle';
import { to12h } from '../../utils/time';

interface OrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onPlan: (order: Order) => void;
  onDefer: (orderId: string) => void;
}

export function OrderDetailDrawer({ orderId, onClose, onPlan, onDefer }: OrderDetailDrawerProps) {
  const { getOrder, tripForOrder, getOutlet, getTrip, deferrals } = useDispatch();
  const order = orderId ? getOrder(orderId) : undefined;
  const trip = order ? tripForOrder(order.id) : undefined;
  const outlet = order ? getOutlet(order.outletId) : undefined;
  const stop = trip?.stops.find((s) => s.orderId === order?.id);
  const history = order ? deferrals.filter((d) => d.orderId === order.id) : [];

  const rows: [string, React.ReactNode][] = order ?
  [
  ['Outlet', outletLabel(outlet)],
  ['Requested', formatDate(order.requestedDate)],
  ['Planned', formatDate(order.plannedDate)],
  ['Created', formatDateTime(order.createdAt)],
  ['Window', formatWindow(order.windowStart, order.windowEnd)],
  ['Quantity', `${order.units} units`],
  ['Weight · volume', `${formatKg(order.weightKg)} · ${formatM3(order.volumeM3)}`],
  ['Needs', requirementText(order, outlet)],
  ['Dock', outlet ? `${DOCK_LABEL[outlet.dock]} — ${outlet.dockNote}` : '—'],
  ['Current trip', trip ? `${tripLabel(trip.number)} · ${trip.vehicleId}${stop ? ` · ETA ${to12h(stopEta(stop))}` : ''}` : '—'],
  ['Past attempts', order.attempts.filter((a) => a !== order.currentTripId).map((a) => getTrip(a) ? tripLabel(getTrip(a)?.number ?? 0) : a).join(', ') || '—'],
  ['Delivered', order.deliveredUnits !== null ? `${order.deliveredUnits} units` : '—'],
  ['Store receipt', order.receipt ? `${order.receipt.receivedUnits} received · ${order.receipt.damagedUnits} damaged · ${order.receipt.missingUnits} missing` : '—']] :

  [];

  return (
    <Drawer
      open={Boolean(order)}
      title={order?.id ?? ''}
      subtitle={
      order &&
      <span className="flex flex-wrap items-center gap-2">
            <BrandTag brand={order.brand} />
            <TempTag temperature={order.temperature} />
            {outlet?.vanOnly && <VanOnlyTag />}
            <StatusBadge badge={orderBadge(order, trip)} size="sm" />
          </span>

      }
      onClose={onClose}
      footer={
      order && order.status !== 'delivered' && order.status !== 'partially_delivered' ?
      <>
            {order.status === 'pending' &&
        <Button size="lg" onClick={() => onPlan(order)} className="flex-1 sm:flex-none">
                Plan Trip
              </Button>
        }
            <Button size="lg" variant="secondary" onClick={() => onDefer(order.id)} className="flex-1 sm:flex-none">
              Defer Order
            </Button>
          </> :
      undefined
      }>
      
      <dl className="divide-y divide-line">
        {rows.map(([label, value]) =>
        <div key={label} className="flex justify-between gap-4 py-3 text-sm">
            <dt className="shrink-0 text-subtle">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        )}
      </dl>
      {order?.note && <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">Store note: {order.note}</p>}
      {history.length > 0 &&
      <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink">Deferral history</h3>
          <DeferralHistory entries={history} compact />
        </div>
      }
    </Drawer>);

}