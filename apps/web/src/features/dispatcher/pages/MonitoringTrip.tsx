import React, { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CircleCheckIcon, MapPinIcon } from 'lucide-react';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/dispatch/StatusBadge';
import { WorkflowBar } from '../components/workflow/WorkflowBar';
import { StopProgress } from '../components/monitoring/StopProgress';
import { StopList } from '../components/monitoring/StopList';
import { DelayIssuePanel } from '../components/monitoring/DelayIssuePanel';
import { DeferOrderModal } from '../components/orders/DeferOrderModal';
import { useDispatch } from '../contexts/DispatchContext';
import { formatDate, formatDateTime } from '../utils/clock';
import { formatNumber, outletLabel, tripLabel } from '../utils/format';
import { currentStop, hasOpenDelay, MONITOR_BADGE, stopEta, tripMonitorState } from '../utils/status';
import { to12h } from '../utils/time';

export function MonitoringTrip() {
  const { tripId } = useParams();
  const { getTrip, getOutlet, getVehicle, getDriver, run, events } = useDispatch();
  const [deferId, setDeferId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trip = tripId ? getTrip(tripId) : undefined;
  if (!trip) return <Navigate to="/monitoring" replace />;
  if (trip.status === 'loading') return <Navigate to={`/loading/${trip.id}`} replace />;

  const vehicle = getVehicle(trip.vehicleId);
  const state = tripMonitorState(trip);
  const stop = currentStop(trip);
  const delayed = trip.stops.filter(hasOpenDelay);
  const log = events.filter((e) => e.tripId === trip.id).slice(0, 12);

  const notify = async (orderId: string) => {
    setBusy(true);
    const res = await run({ op: 'notifyStore', tripId: trip.id, orderId, message: '' });
    setBusy(false);
    if (res.ok) toast.success('Store notified', { description: 'The delay stays open until the driver arrives.' });
  };

  return (
    <PageContainer className="max-w-[1200px]">
      <PageHeader
        backTo={{ to: '/monitoring', label: 'Delivery Monitoring' }}
        title={tripLabel(trip.number)}
        subtitle={`${formatDate(trip.date)} · ${trip.vehicleId}${vehicle ? ` · ${vehicle.type}` : ''} · ${getDriver(trip.driverId)?.name ?? trip.driverId}${trip.departedAt ? ` · left ${formatDateTime(trip.departedAt)}` : ''} · ${formatNumber(trip.distanceKm)} km · ${formatNumber(trip.fuelL)} L`}
        meta={<StatusBadge badge={MONITOR_BADGE[state]} />} />
      
      <WorkflowBar active={['monitor', 'problems']} className="mt-4" />

      <Card className="mt-6 grid gap-5 p-5 md:grid-cols-2 md:items-center md:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-ink">
            {state === 'completed' ? <CircleCheckIcon aria-hidden="true" className="h-5 w-5 text-forest" /> : <MapPinIcon aria-hidden="true" className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm text-subtle">Where is the trip?</p>
            <p className="text-lg font-semibold text-ink">
              {state === 'completed' ? 'Trip complete' : stop ? `${stop.status === 'arrived' ? 'At' : 'Heading to'} ${outletLabel(getOutlet(stop.outletId))} · ETA ${to12h(stopEta(stop))}` : 'On the road'}
            </p>
          </div>
        </div>
        <StopProgress stops={trip.stops} />
      </Card>

      {delayed.map((s) =>
      <div key={s.orderId} className="mt-6">
          <DelayIssuePanel stop={s} outlet={getOutlet(s.outletId)} busy={busy} onNotify={() => void notify(s.orderId)} onDefer={() => setDeferId(s.orderId)} />
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="p-5 md:p-6">
          <h2 className="text-lg font-semibold text-ink">Stops</h2>
          <p className="text-sm text-subtle">In delivery order · updated by the driver</p>
          <div className="mt-5">
            <StopList trip={trip} />
          </div>
        </Card>
        <Card className="p-5 md:p-6">
          <h2 className="text-lg font-semibold text-ink">Activity</h2>
          {log.length === 0 ?
          <p className="mt-3 text-sm text-subtle">No activity yet.</p> :

          <ol className="mt-3 space-y-3">
              {log.map((e) =>
            <li key={e.id} className="text-sm">
                  <p className="text-ink">{e.message}</p>
                  <p className="text-xs text-subtle">
                    {e.actorName} · {formatDateTime(e.at)}
                  </p>
                </li>
            )}
            </ol>
          }
        </Card>
      </div>

      <DeferOrderModal orderId={deferId} onClose={() => setDeferId(null)} defaultReason="window" />
    </PageContainer>);

}