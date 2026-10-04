import React, { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/dispatch/StatusBadge';
import { SignaturePad } from '../../components/driver/SignaturePad';
import { useDispatch } from '../../contexts/DispatchContext';
import { useSync } from '../../contexts/SyncContext';
import type { Stop, Trip } from '../../types/dispatch';
import type { FieldAction } from '../../utils/fieldOps';
import { formatDate } from '../../utils/clock';
import { formatWindow, outletLabel, tripLabel } from '../../utils/format';
import { currentStop, stopBadge, stopEta } from '../../utils/status';
import { to12h } from '../../utils/time';

const INPUT = 'mt-1.5 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand';

export function DriverTrip() {
  const { tripId } = useParams();
  const { getTrip } = useDispatch();
  const trip = tripId ? getTrip(tripId) : undefined;
  if (!trip) return <Navigate to="/driver" replace />;
  const current = currentStop(trip);

  return (
    <PageContainer className="max-w-[720px]">
      <PageHeader backTo={{ to: '/driver', label: 'My Trips' }} title={tripLabel(trip.number)} subtitle={`${formatDate(trip.date)} · departs ${to12h(trip.departAt)} · ${trip.vehicleId}`} />
      {trip.status === 'loading' && <p className="mt-4 rounded-2xl bg-amber-pale px-4 py-3 text-sm text-amber-ink">Waiting for the loader to release this trip.</p>}
      <ol className="mt-6 space-y-3">
        {trip.stops.map((s) =>
        <li key={s.orderId}>
            <StopCard trip={trip} stop={s} active={trip.status === 'on_road' && current?.orderId === s.orderId} />
          </li>
        )}
      </ol>
    </PageContainer>);

}

function StopCard({ trip, stop, active }: {trip: Trip;stop: Stop;active: boolean;}) {
  const { getOutlet, getOrder } = useDispatch();
  const { submit, online } = useSync();
  const outlet = getOutlet(stop.outletId);
  const order = getOrder(stop.orderId);
  const line = trip.load.find((l) => l.orderId === stop.orderId);
  const loaded = line?.loadedUnits ?? 0;
  const [mode, setMode] = useState<'none' | 'deliver' | 'delay' | 'fail'>('none');
  const [delivered, setDelivered] = useState(String(loaded));
  const [damaged, setDamaged] = useState('0');
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [minutes, setMinutes] = useState('15');
  const [reason, setReason] = useState('');

  const send = async (action: FieldAction, msg: string) => {
    await submit(action);
    setMode('none');
    toast.success(msg, { description: online ? 'Syncing now.' : 'Saved on this device — will sync when back online.' });
  };

  return (
    <Card className={`p-5 ${active ? 'ring-2 ring-brand' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {stop.seq}. {outletLabel(outlet)}
          </p>
          <p className="text-sm text-subtle">
            {stop.orderId} · {loaded} units loaded{order ? ` of ${order.units}` : ''} · ETA {to12h(stopEta(stop))}
          </p>
          {order && <p className="text-sm text-subtle">Window {formatWindow(order.windowStart, order.windowEnd)}</p>}
          {outlet && <p className="mt-1 text-sm text-ink">{outlet.address} · {outlet.dockNote}{outlet.instructions ? ` · ${outlet.instructions}` : ''}</p>}
        </div>
        <StatusBadge badge={stopBadge(stop)} size="sm" />
      </div>

      {active && mode === 'none' &&
      <div className="mt-4 flex flex-wrap gap-2">
          {stop.status === 'pending' &&
        <Button size="lg" onClick={() => void send({ type: 'arrive', tripId: trip.id, orderId: stop.orderId }, 'Arrival recorded')}>
              Arrived
            </Button>
        }
          <Button size="lg" variant="secondary" onClick={() => setMode('deliver')}>
            Deliver
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setMode('delay')}>
            Report delay
          </Button>
          <Button size="lg" variant="ghost" onClick={() => setMode('fail')}>
            Failed attempt
          </Button>
        </div>
      }

      {active && mode === 'deliver' &&
      <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Delivered units</span>
              <input type="number" min={1} max={loaded} value={delivered} onChange={(e) => setDelivered(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Damaged units</span>
              <input type="number" min={0} value={damaged} onChange={(e) => setDamaged(e.target.value)} className={INPUT} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Note (required if short or damaged)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Recipient name</span>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className={INPUT} />
          </label>
          <div>
            <span className="text-sm font-semibold text-ink">Recipient signature</span>
            <div className="mt-1.5">
              <SignaturePad onChange={setSignature} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
            size="lg"
            disabled={!recipient.trim() || !signature}
            onClick={() =>
            void send(
              {
                type: 'deliver',
                tripId: trip.id,
                orderId: stop.orderId,
                deliveredUnits: Number(delivered),
                damagedUnits: Number(damaged),
                note,
                pod: { recipientName: recipient, signature: signature ?? '', note, capturedAt: new Date().toISOString() }
              },
              'Delivery recorded'
            )
            }>
            
              Confirm delivery
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setMode('none')}>
              Cancel
            </Button>
          </div>
        </div>
      }

      {active && (mode === 'delay' || mode === 'fail') &&
      <div className="mt-4 space-y-3">
          {mode === 'delay' &&
        <label className="block">
              <span className="text-sm font-semibold text-ink">Minutes late</span>
              <input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={INPUT} />
            </label>
        }
          <label className="block">
            <span className="text-sm font-semibold text-ink">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT} />
          </label>
          <div className="flex gap-2">
            <Button
            size="lg"
            disabled={!reason.trim()}
            onClick={() =>
            void send(
              mode === 'delay' ? { type: 'reportDelay', tripId: trip.id, orderId: stop.orderId, minutes: Number(minutes), reason } : { type: 'failStop', tripId: trip.id, orderId: stop.orderId, reason },
              mode === 'delay' ? 'Delay reported' : 'Failed attempt recorded'
            )
            }>
            
              Submit
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setMode('none')}>
              Cancel
            </Button>
          </div>
        </div>
      }
    </Card>);

}