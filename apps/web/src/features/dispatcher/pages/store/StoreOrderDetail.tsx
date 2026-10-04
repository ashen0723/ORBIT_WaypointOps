import React, { FormEvent, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/dispatch/StatusBadge';
import { useDispatch } from '../../contexts/DispatchContext';
import { formatDate, formatDateTime } from '../../utils/clock';
import { tripLabel } from '../../utils/format';
import { hasOpenDelay, orderBadge, stopEta } from '../../utils/status';
import { to12h } from '../../utils/time';

const INPUT = 'mt-1.5 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand';

export function StoreOrderDetail() {
  const { orderId } = useParams();
  const { getOrder, tripForOrder, deferrals, run } = useDispatch();
  const order = orderId ? getOrder(orderId) : undefined;
  const [received, setReceived] = useState('');
  const [damaged, setDamaged] = useState('0');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!order) return <Navigate to="/store" replace />;

  const trip = tripForOrder(order.id);
  const stop = trip?.stops.find((s) => s.orderId === order.id);
  const line = trip?.load.find((l) => l.orderId === order.id);
  const history = deferrals.filter((d) => d.orderId === order.id);
  const canConfirm = (order.status === 'delivered' || order.status === 'partially_delivered') && !order.receipt;

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await run({ op: 'confirmReceipt', orderId: order.id, receivedUnits: Number(received || order.deliveredUnits || 0), damagedUnits: Number(damaged), note });
    setBusy(false);
    if (res.ok) toast.success('Receipt confirmed');
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader backTo={{ to: '/store', label: 'My Orders' }} title={order.id} subtitle={`${order.brand} · ${order.temperature} · ${order.units} units`} meta={<StatusBadge badge={orderBadge(order, trip)} />} />

      <Card className="mt-6 p-5 md:p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">Requested date</dt>
            <dd className="font-semibold text-ink">{formatDate(order.requestedDate)}</dd>
          </div>
          <div>
            <dt className="text-subtle">Planned date</dt>
            <dd className="font-semibold text-ink">{formatDate(order.plannedDate)}</dd>
          </div>
          <div>
            <dt className="text-subtle">Trip</dt>
            <dd className="font-semibold text-ink">{trip ? `${tripLabel(trip.number)} · ${trip.vehicleId}` : 'Not allocated yet'}</dd>
          </div>
          <div>
            <dt className="text-subtle">ETA</dt>
            <dd className="font-semibold text-ink">{stop ? to12h(stopEta(stop)) : '—'}</dd>
          </div>
        </dl>
        {stop && hasOpenDelay(stop) && <p className="mt-4 rounded-2xl bg-danger-pale px-4 py-3 text-sm text-danger-ink">Delayed {stop.delay?.minutes} min: {stop.delay?.reason}</p>}
        {line && line.loadedUnits !== null && (line.loadedUnits < line.expectedUnits || line.damagedUnits > 0) &&
        <p className="mt-4 rounded-2xl bg-amber-pale px-4 py-3 text-sm text-amber-ink">
            Loading exception: {line.loadedUnits} of {line.expectedUnits} loaded, {line.damagedUnits} damaged — {line.reason}
          </p>
        }
      </Card>

      {history.length > 0 &&
      <Card className="mt-6 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-ink">Reschedules</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((d) =>
          <li key={d.id} className="text-ink">
                {formatDate(d.fromDate)} → {formatDate(d.toDate)} · {d.reason.replace(/_/g, ' ')}
                {d.note ? ` — ${d.note}` : ''} <span className="text-subtle">({formatDateTime(d.at)})</span>
              </li>
          )}
          </ul>
        </Card>
      }

      {order.receipt &&
      <Card className="mt-6 p-5 text-sm md:p-6">
          <h2 className="text-lg font-semibold text-ink">Receipt</h2>
          <p className="mt-2 text-ink">
            {order.receipt.receivedUnits} received · {order.receipt.damagedUnits} damaged · {order.receipt.missingUnits} missing
          </p>
          {order.receipt.note && <p className="text-subtle">{order.receipt.note}</p>}
        </Card>
      }

      {canConfirm &&
      <Card className="mt-6 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-ink">Confirm receipt</h2>
          <p className="text-sm text-subtle">Driver handed over {order.deliveredUnits} units.</p>
          <form onSubmit={(e) => void confirm(e)} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Received in good condition</span>
                <input type="number" min={0} value={received} placeholder={String(order.deliveredUnits ?? 0)} onChange={(e) => setReceived(e.target.value)} className={INPUT} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Damaged</span>
                <input type="number" min={0} value={damaged} onChange={(e) => setDamaged(e.target.value)} className={INPUT} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Note (required if missing or damaged)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
            </label>
            <Button type="submit" size="lg" disabled={busy}>
              Confirm Receipt
            </Button>
          </form>
        </Card>
      }
    </PageContainer>);

}