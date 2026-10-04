import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/dispatch/StatusBadge';
import { LoadingStatusPanel } from '../components/loading/LoadingStatusPanel';
import { LoadLineRow } from '../components/loading/LoadLineRow';
import { StopSequence } from '../components/loading/StopSequence';
import { useDispatch } from '../contexts/DispatchContext';
import { useSync } from '../contexts/SyncContext';
import type { FieldAction } from '../utils/fieldOps';
import { formatDate } from '../utils/clock';
import { tripLabel } from '../utils/format';
import { LOADING_BADGE, tripLoadingState } from '../utils/status';
import { to12h } from '../utils/time';

export function LoadingTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { getTrip, getOrder, getOutlet, getVehicle, getDriver, user } = useDispatch();
  const { submit, ops, online } = useSync();
  const trip = tripId ? getTrip(tripId) : undefined;
  if (!trip) return <Navigate to="/loading" replace />;

  const loader = user.role === 'loader';
  const editable = loader && trip.status === 'loading';
  const vehicle = getVehicle(trip.vehicleId);
  const pendingFor = (orderId?: string) => ops.some((o) => (o.state === 'pending' || o.state === 'syncing') && o.action.tripId === trip.id && (!orderId || 'orderId' in o.action && o.action.orderId === orderId));

  const send = async (action: FieldAction, message: string) => {
    await submit(action);
    toast.success(message, { description: online ? 'Saved — syncing now.' : 'Saved on this device. It will sync when you reconnect.' });
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        backTo={{ to: '/loading', label: loader ? 'Trips to load' : 'Loading' }}
        title={tripLabel(trip.number)}
        subtitle={`${formatDate(trip.date)} · departs ${to12h(trip.departAt)} · ${trip.vehicleId}${vehicle ? ` (${vehicle.type})` : ''} · Driver ${getDriver(trip.driverId)?.name ?? trip.driverId}`}
        meta={<StatusBadge badge={LOADING_BADGE[tripLoadingState(trip)]} />} />
      
      {!loader && trip.status === 'loading' && <p className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm text-subtle shadow-card">Read-only. The depot loader records counts and releases the trip.</p>}

      <div className="mt-6">
        <LoadingStatusPanel
          trip={trip}
          canAct={editable}
          onAck={(note) => void send({ type: 'ackExceptions', tripId: trip.id, note }, 'Exceptions acknowledged')}
          onDepart={() => void send({ type: 'depart', tripId: trip.id }, `${tripLabel(trip.number)} released`)}
          onTrack={!loader ? () => navigate(`/monitoring/${trip.id}`) : undefined} />
        
      </div>

      <StopSequence stops={trip.stops} />

      <Card className="mt-6">
        <div className="border-b border-line px-4 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-ink">Orders on this trip</h2>
          <p className="text-sm text-subtle">Record good units loaded, damaged units held back, and why anything is short.</p>
        </div>
        <ul className="divide-y divide-line">
          {trip.load.map((l) => {
            const order = getOrder(l.orderId);
            const stop = trip.stops.find((s) => s.orderId === l.orderId);
            if (!order) return null;
            return (
              <LoadLineRow
                key={l.orderId}
                line={l}
                order={order}
                outlet={getOutlet(order.outletId)}
                seq={stop?.seq ?? 0}
                editable={editable}
                pending={pendingFor(l.orderId)}
                onSave={(loaded, damaged, reason) => void send({ type: 'recordLoad', tripId: trip.id, orderId: l.orderId, loadedUnits: loaded, damagedUnits: damaged, reason }, `${l.orderId} count saved`)} />);


          })}
        </ul>
      </Card>
    </PageContainer>);

}